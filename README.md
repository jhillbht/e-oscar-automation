# E-Oscar Dispute Review Automation

This project automates the E-Oscar dispute review process, eliminating the need for manual reviews and saving approximately 1 hour of developer time per day.

## Features

- **Web-Based Interface**: Access the automation from any device with a web browser
- **Automated Report Download**: Download reports from E-Oscar with customizable date ranges
- **Dispute Categorization**: Automatically categorize disputes as frivolous or non-frivolous
- **ClickUp Integration**: Update ClickUp tickets based on dispute categorization
- **Scheduled Jobs**: Run automation daily with configurable schedules
- **Audit Logging**: Comprehensive logging for all operations

## Architecture

- **Frontend**: Hosted on Firebase Hosting
- **Backend**: Firebase Cloud Functions
- **Database**: Firestore
- **Browser Automation**: Puppeteer running in Firebase Cloud Functions
- **Integrations**: Slack, Google Sheets, ClickUp

## Prerequisites

To run this application, you'll need:

- Firebase account
- Google Cloud Platform account
- Slack workspace with a bot
- ClickUp account with API access
- GCP service account for Google Sheets integration

## Setup Instructions

### Option 1: Using Docker

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/e-oscar-automation.git
   cd e-oscar-automation
   ```

2. **Create a .env file**:
   ```
   SLACK_TOKEN=your-slack-token
   SLACK_OTP_CHANNEL=otp-test
   CLICKUP_API_TOKEN=your-clickup-token
   CLICKUP_LIST_ID=your-clickup-list-id
   GOOGLE_SHEETS_ID=1XrGspfqOI3mlkO-d_MIZYiEyyDHpZjaBqRWXlF6pIQU
   EMAIL_USER=your-email@example.com
   EMAIL_PASSWORD=your-email-password
   ALERT_EMAIL=notifications@example.com
   FIREBASE_TOKEN=your-firebase-token
   ```

3. **Create GCP credentials directory**:
   ```bash
   mkdir -p gcp-credentials
   ```

4. **Copy your service account key** to `gcp-credentials/service-account.json`

5. **Start the application**:
   ```bash
   docker-compose up -d
   ```

6. **Access the application** at http://localhost:8080

### Option 2: Firebase Deployment

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Log in to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize the project**:
   ```bash
   firebase init
   ```

4. **Set environment variables**:
   ```bash
   firebase functions:config:set slack.token="your-slack-token" slack.channel="otp-test" clickup.token="your-clickup-token" clickup.list_id="your-clickup-list-id" google.sheets_id="1XrGspfqOI3mlkO-d_MIZYiEyyDHpZjaBqRWXlF6pIQU" email.user="your-email@example.com" email.password="your-email-password" email.alert="notifications@example.com"
   ```

5. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

## How to Use

### Manual Operation

1. **Sign in** to the web interface using your Google account
2. **Select the operation** (Download Reports or Review Disputes)
3. **Choose the client** (or "All Clients")
4. **Set the date range**
5. **Click the button** to start the automation
6. **Monitor progress** in real-time
7. **View results** when the operation completes

### Scheduled Operation

The automation runs automatically every day at 9:00 AM Eastern Time:

- On weekdays, it processes the previous day's disputes
- On Mondays, it processes disputes from Friday through Sunday

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Check if E-Oscar credentials are correct
   - Verify that Slack OTP forwarding is working
   - Check if password has expired (they expire every 30-60 days)

2. **Integration Errors**:
   - Verify API tokens for Slack, ClickUp, etc.
   - Check permissions for Google Sheets service account
   - Ensure all required environment variables are set

3. **Browser Automation Issues**:
   - If E-Oscar website structure changes, update the selectors in the code
   - Increase timeout values for slow connections
   - Check browser console logs for errors

### Logs

- **Web Interface**: View logs in the "Automation Status" section
- **Firebase Console**: View function logs in the Firebase Console
- **Docker**: View container logs with `docker logs e-oscar-firebase-app`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.