const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { downloadReportsHandler } = require('./src/handlers/download-reports');
const { reviewDisputesHandler } = require('./src/handlers/review-disputes');
const { updateStatusHandler } = require('./src/handlers/update-status');
const { scheduledJobHandler } = require('./src/handlers/scheduled-job');

// Initialize Firebase Admin
admin.initializeApp();

// Cloud Functions
exports.downloadReports = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '2GB',
  })
  .https.onCall(downloadReportsHandler);

exports.reviewDisputes = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '2GB',
  })
  .https.onCall(reviewDisputesHandler);

exports.updateStatus = functions.https.onCall(updateStatusHandler);

// Scheduled function to run every day at 9:00 AM
exports.scheduledJob = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('America/New_York')
  .onRun(scheduledJobHandler);
