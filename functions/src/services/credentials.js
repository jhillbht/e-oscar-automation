const admin = require('firebase-admin');
const { googleSheetsService } = require('./google-sheets');
const { logger } = require('../utils/logger');

/**
 * Get credentials for a specific client or all clients
 * @param {string} clientName - Client name or 'all' for all clients
 * @returns {Promise<Array>} - Array of credential objects
 */
async function getCredentials(clientName) {
  try {
    logger.info(`Getting credentials for ${clientName === 'all' ? 'all clients' : clientName}`);
    
    let credentials = [];
    
    // First, try to get credentials from Firestore
    const firestoreCredentials = await getCredentialsFromFirestore(clientName);
    
    if (firestoreCredentials && firestoreCredentials.length > 0) {
      logger.info(`Found ${firestoreCredentials.length} credentials in Firestore`);
      credentials = firestoreCredentials;
    } else {
      // Fall back to Google Sheets if no credentials in Firestore
      logger.info('No credentials found in Firestore, falling back to Google Sheets');
      const sheetsCredentials = await getCredentialsFromGoogleSheets(clientName);
      
      if (sheetsCredentials && sheetsCredentials.length > 0) {
        logger.info(`Found ${sheetsCredentials.length} credentials in Google Sheets`);
        credentials = sheetsCredentials;
        
        // Save to Firestore for future use
        await saveCredentialsToFirestore(sheetsCredentials);
      }
    }
    
    if (credentials.length === 0) {
      logger.warn(`No credentials found for ${clientName === 'all' ? 'any client' : clientName}`);
    }
    
    return credentials;
  } catch (error) {
    logger.error('Error getting credentials:', error);
    throw error;
  }
}

/**
 * Get credentials from Firestore
 * @param {string} clientName - Client name or 'all' for all clients
 * @returns {Promise<Array>} - Array of credential objects
 */
async function getCredentialsFromFirestore(clientName) {
  try {
    let query = admin.firestore().collection('credentials')
      .where('active', '==', true);
    
    if (clientName !== 'all') {
      query = query.where('client_name', '==', clientName);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    const credentials = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      credentials.push({
        id: doc.id,
        username: data.username,
        password: data.password,
        client_name: data.client_name,
        password_expires: data.password_expires
      });
    });
    
    // Log access for audit purposes
    for (const credential of credentials) {
      await admin.firestore().collection('credential_access').add({
        credential_id: credential.id,
        action_type: 'get_credential',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return credentials;
  } catch (error) {
    logger.error('Error getting credentials from Firestore:', error);
    return [];
  }
}

/**
 * Get credentials from Google Sheets
 * @param {string} clientName - Client name or 'all' for all clients
 * @returns {Promise<Array>} - Array of credential objects
 */
async function getCredentialsFromGoogleSheets(clientName) {
  try {
    const allCredentials = await googleSheetsService.getCredentials();
    
    if (clientName === 'all') {
      return allCredentials;
    } else {
      return allCredentials.filter(cred => cred.clientName === clientName);
    }
  } catch (error) {
    logger.error('Error getting credentials from Google Sheets:', error);
    return [];
  }
}

/**
 * Save credentials to Firestore
 * @param {Array} credentials - Array of credential objects
 * @returns {Promise<void>}
 */
async function saveCredentialsToFirestore(credentials) {
  try {
    const batch = admin.firestore().batch();
    
    for (const credential of credentials) {
      const credRef = admin.firestore().collection('credentials').doc();
      
      // Calculate password expiration date (60 days from now)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60);
      
      batch.set(credRef, {
        username: credential.username,
        password: credential.password,
        client_name: credential.clientName,
        active: true,
        password_last_changed: admin.firestore.FieldValue.serverTimestamp(),
        password_expires: admin.firestore.Timestamp.fromDate(expirationDate),
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    logger.info(`Saved ${credentials.length} credentials to Firestore`);
  } catch (error) {
    logger.error('Error saving credentials to Firestore:', error);
  }
}

module.exports = {
  getCredentials
};