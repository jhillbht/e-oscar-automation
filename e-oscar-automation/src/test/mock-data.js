/**
 * Mock data for testing the E-Oscar Dispute Review automation
 */

// Mock disputes for testing
const mockDisputes = [
  {
    id: 'test-dispute-1',
    control_number: 'TEST1234567',
    client_name: 'TestClient',
    date_furnisher: 'Test Bank',
    date_received: '2023-04-01',
    response_due_date: '2023-04-15',
    first_name: 'John',
    last_name: 'Doe',
    dispute_status: 'Pending',
    clickup_task_id: 'test-task-1'
  },
  {
    id: 'test-dispute-2',
    control_number: 'TEST7654321',
    client_name: 'TestClient',
    date_furnisher: 'Test Credit Union',
    date_received: '2023-04-02',
    response_due_date: '2023-04-16',
    first_name: 'Jane',
    last_name: 'Smith',
    dispute_status: 'Pending',
    clickup_task_id: 'test-task-2'
  }
];

// Mock credentials for testing
const mockCredentials = {
  id: 'test-credential-1',
  username: 'test-user',
  password: 'test-password',
  client_name: 'TestClient',
  password_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};

// Mock case details for testing categorization
const mockCaseDetails = [
  {
    // Non-frivolous case (Dispute Code 1 contains "103")
    disputeCode1: 'The consumer disputes this account information: 103 - Account belongs to someone else',
    disputeCode2: '',
    images: '--',
    fcraRelevantInfo: '--'
  },
  {
    // Frivolous case (no non-frivolous indicators)
    disputeCode1: 'The consumer disputes this account information',
    disputeCode2: '',
    images: '--',
    fcraRelevantInfo: '--'
  }
];

module.exports = {
  mockDisputes,
  mockCredentials,
  mockCaseDetails
};
