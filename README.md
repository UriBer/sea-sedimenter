# Sea Sedimenter - IMU-Based Shipboard Weighing Measurement Tool

A single-page Progressive Web App (PWA) that uses device IMU sensors (accelerometer + gyroscope) to gate and correct shipboard weighing measurements, providing real-time motion analysis and uncertainty estimation.

**Created by:** [Uri Berman - Even-Derech-It.com](https://even-derech-it.com)

**License:** [GNU General Public License v3.0](LICENSE)

**Repository:** [GitHub](https://github.com/uriber/sea-sedimenter)

## Features

- **Real-time IMU Processing**: Continuous gravity estimation, vertical acceleration (a_z) calculation, and roll/pitch computation
- **Motion Gating**: Live stability assessment with configurable thresholds
- **Measurement Sessions**: Collect timestamped samples during user-initiated measurement periods
- **Motion Correction**: Optional physics-based correction using vertical acceleration
- **Robust Aggregation**: Median and trimmed mean for reliable results
- **Uncertainty Estimation**: Error bands based on motion variance and sample statistics
- **PWA-Ready**: Installable on Android Chrome and iPhone Safari

## Requirements

- **HTTPS**: Required for device sensor access (DeviceMotion/DeviceOrientation API)
- **Modern Browser**: Android Chrome or iPhone Safari (iOS 13+)
- **Device Sensors**: Accelerometer and gyroscope

## Installation & Development

### Prerequisites

- Node.js 18+ and npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev          # Uses HTTPS by default (required for sensors)
npm run dev:http     # Use HTTP (app loads but sensors won't work)
npm run dev:https    # Explicitly use HTTPS

# Build for production
npm run build

# Preview production build
npm run preview
```

**Development Server Modes:**
- **HTTPS** (`npm run dev` or `npm run dev:https`): Required for device sensors to work. Uses self-signed certificate.
- **HTTP** (`npm run dev:http`): App loads but sensors are disabled (useful for UI development without sensors).

The HTTPS server will start on `https://localhost:5173` (Vite automatically generates self-signed certificates).

### HTTPS Setup for Development

Vite's dev server uses HTTPS by default. On first run, you'll need to accept the self-signed certificate:

1. Open `https://localhost:5173` in your browser
2. Accept the security warning (click "Advanced" → "Proceed to localhost")
3. The app will load

### Production Deployment

For production, deploy to any HTTPS-enabled hosting service:

- **Google Cloud Platform (GCP)**: See [GCP Deployment](#gcp-deployment) section below
- **Netlify**: Connect your repo, set build command: `npm run build`, publish directory: `dist`
- **Vercel**: Connect your repo, framework preset: Vite
- **GitHub Pages**: Use GitHub Actions to build and deploy
- **Custom Server**: Serve the `dist` folder over HTTPS (nginx, Apache, etc.)

## GCP Deployment

### Option A: Terraform (Recommended)

Terraform automates the creation of the GCP project and infrastructure:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project_id

terraform init
terraform plan
terraform apply
```

See [terraform/README.md](terraform/README.md) for detailed instructions.

### Option B: Manual Deployment

### Prerequisites

- Google Cloud Platform account
- `gcloud` CLI installed and configured
- Docker installed (for local testing)

#### Option 1: Cloud Run (Manual)

Cloud Run provides serverless container hosting with automatic HTTPS.

#### Quick Deployment (Using Script)

```bash
# Make script executable (first time only)
chmod +x deploy.sh

# Deploy
./deploy.sh your-project-id us-central1
```

#### Manual Deployment

```bash
# Set your GCP project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/sea-sedimenter

# Deploy to Cloud Run
gcloud run deploy sea-sedimenter \
  --image gcr.io/$PROJECT_ID/sea-sedimenter \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 10
```

#### Automated CI/CD with Cloud Build

1. **Connect Repository** (optional):
   ```bash
   # Connect to Cloud Source Repositories or GitHub
   gcloud source repos create sea-sedimenter
   ```

2. **Set up Cloud Build Trigger**:
   - Go to Cloud Build → Triggers in GCP Console
   - Create trigger from your repository
   - Use `cloudbuild.yaml` configuration file
   - Set branch/tag filters as needed

3. **Deploy**:
   - Push to your repository
   - Cloud Build will automatically build and deploy

#### Environment Variables (if needed)

```bash
gcloud run services update sea-sedimenter \
  --set-env-vars KEY=VALUE \
  --region us-central1
```

### Option 2: Cloud Storage + Cloud CDN (Static Hosting)

For simpler static hosting:

```bash
# Create bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l us-central1 gs://$PROJECT_ID-sea-sedimenter

# Build locally
npm run build

# Upload to bucket
gsutil -m rsync -r dist/ gs://$PROJECT_ID-sea-sedimenter/

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://$PROJECT_ID-sea-sedimenter/

# Set up Cloud CDN (optional, for better performance)
# Create a load balancer pointing to the bucket
```

### Custom Domain

1. **Get your Cloud Run URL**:
   ```bash
   gcloud run services describe sea-sedimenter --region us-central1 --format 'value(status.url)'
   ```

2. **Map Custom Domain**:
   - In Cloud Run console, go to your service
   - Click "Manage Custom Domains"
   - Add your domain and follow DNS setup instructions

### Monitoring & Logs

```bash
# View logs
gcloud run services logs read sea-sedimenter --region us-central1

# View metrics in Cloud Console
# Navigate to Cloud Run → sea-sedimenter → Metrics
```

### Cost Estimation

- **Cloud Run**: Pay per request (~$0.40 per million requests)
- **Container Registry**: Free tier includes 0.5 GB storage
- **Cloud Build**: Free tier includes 120 build-minutes/day
- **Estimated cost**: < $10/month for low-medium traffic

## iOS Permission Setup

iOS Safari requires explicit user permission for motion sensors:

1. **First Time**: User must tap "Enable Sensors" button
2. **Permission Dialog**: iOS will show a permission prompt
3. **Grant Permission**: User must tap "Allow" in the system dialog
4. **Settings**: If denied, user must go to Safari Settings → Privacy & Security → Motion & Orientation Access

### Testing on iOS

1. Deploy to HTTPS server (or use ngrok/tunneling service for local testing)
2. Open in Safari on iPhone
3. Tap "Enable Sensors" when prompted
4. Grant permission in system dialog

## Usage Guide

### Basic Workflow

1. **Enable Sensors**: Tap "Enable Sensors" (required on iOS)
2. **Start Sensors**: Tap "Start Sensors" to begin IMU data collection
3. **Enter Scale Reading**: Type the current scale reading in grams
4. **Wait for Stability**: Monitor the "MEASURE OK" badge - wait until stable
5. **Start Measurement**: Tap "MEASURE" to begin a measurement session
6. **Monitor Session**: Watch elapsed time, sample count, and quality indicator
7. **Stop Measurement**: Tap "STOP MEASURING" when done
8. **View Results**: See fixed measurement, error band, and confidence

### Input Fields

- **Scale Reading**: Current scale value in grams (can be updated during session)
- **Sample Mass Default**: Default mass for error calculations (default: 150g)
- **Bias/Tare**: Optional offset to subtract from readings (default: 0g)
- **Motion Correction**: Toggle to enable/disable physics-based correction

### Configuration

- **Gravity Filter Alpha**: Low-pass filter coefficient (0.90-0.98, default: 0.92)
  - Higher = slower response, more stable gravity estimate
  - Lower = faster response, more sensitive to motion

### Live Metrics

- **a_z**: Vertical acceleration along gravity (m/s²)
- **Roll/Pitch**: Device orientation angles (degrees)
- **RMS Values**: Root mean square over 5-second window
- **Sampling Rate**: Estimated sensor update rate (Hz)
- **Confidence**: Stability score (0-100%)
- **MEASURE OK / NOT STABLE**: Live gating status

### Measurement Results

- **Fixed Measurement**: Corrected and aggregated value (grams)
- **Error Band**: ± uncertainty at 95% confidence (grams)
- **Relative Error**: Percentage uncertainty
- **Confidence**: Overall measurement quality (0-100%)
- **Diagnostics**: Detailed statistics (expandable)

## Tuning Guide for Ship Environment

### Default Thresholds

The app comes with default thresholds tuned for ~150g samples on a ship:

- **T_az_rms**: 0.35 m/s² (RMS vertical acceleration)
- **T_roll_rms**: 2.5° (RMS roll angle)
- **T_pitch_rms**: 2.5° (RMS pitch angle)
- **T_az_instant**: 0.8 m/s² (instantaneous a_z limit)
- **T_roll_instant**: 6.0° (instantaneous roll limit)
- **T_pitch_instant**: 6.0° (instantaneous pitch limit)

### Adjusting for Your Environment

**For Calmer Conditions** (docked, calm seas):
- Lower thresholds for stricter gating
- Example: T_az_rms = 0.25 m/s², T_roll_rms = 2.0°

**For Rough Conditions** (heavy seas, underway):
- Raise thresholds to allow measurements in more motion
- Example: T_az_rms = 0.5 m/s², T_roll_rms = 4.0°
- Note: Higher thresholds reduce measurement accuracy

**For Different Sample Masses**:
- Heavier samples: Can tolerate more motion (raise thresholds)
- Lighter samples: Need calmer conditions (lower thresholds)

### Gravity Filter Alpha

- **Calm conditions**: Use higher alpha (0.95-0.98) for stable gravity estimate
- **Active motion**: Use lower alpha (0.90-0.92) for faster adaptation

### Uncertainty Factor (k)

Default k = 2.0 provides ~95% confidence interval. Adjust in code if needed:
- Lower k (1.5-1.8): Tighter error bands, less conservative
- Higher k (2.5-3.0): Wider error bands, more conservative

## Known Limitations

### Device Variability

- **Sensor Calibration**: Different devices have varying sensor accuracy and calibration
- **Sampling Rates**: Device-dependent (typically 50-200 Hz)
- **Sensor Drift**: Long-term drift may affect gravity estimate (reset sensors periodically)

### Manual Input

- **Human Error**: Scale readings entered manually are subject to human error
- **Timing**: User must enter readings promptly during session
- **No OCR**: App does not read scale displays automatically

### Motion Correction Model

- **Linear Assumption**: Correction formula assumes linear acceleration model
- **No Gyro Integration**: Uses accelerometer-derived a_z only (no gyro fusion)
- **Phase Issues**: If scale has internal filtering, motion correction may introduce phase errors (disable if needed)

### Browser Limitations

- **iOS Safari**: Requires explicit permission, may have stricter rate limiting
- **Android Chrome**: Generally more permissive, but behavior varies by device
- **HTTPS Required**: Sensors only work over HTTPS (not HTTP)

### Measurement Accuracy

- **Uncertainty Estimates**: Approximate, based on statistical models
- **No Ground Truth**: App cannot verify absolute accuracy without reference
- **Environmental Factors**: Temperature, humidity, and other factors not accounted for

## Technical Architecture

### Core Components

- **SensorManager**: Handles permissions and event subscription
- **IMUProcessor**: Gravity estimation, a_z calculation, roll/pitch
- **SessionManager**: Measurement session lifecycle and data collection
- **MeasurementCalculator**: Motion correction, aggregation, uncertainty
- **RingBuffer**: Efficient circular buffer for live RMS windows

### Data Flow

```
Raw Sensor Data → IMUProcessor → Processed IMU Data
                                      ↓
                              Live Metrics Display
                                      ↓
User clicks MEASURE → SessionManager → Collects Samples
                                      ↓
                              MeasurementCalculator
                                      ↓
                              Final Result + Uncertainty
```

### Key Algorithms

- **Gravity Estimation**: Low-pass filter on acceleration including gravity
- **Vertical Acceleration**: Dot product of linear acceleration with unit gravity vector
- **Roll/Pitch**: Computed from gravity vector (no magnetometer)
- **Motion Correction**: `corrected = reading * g / (g + a_z)`
- **Uncertainty**: `sigma_total = sqrt(sigma_motion² + sigma_scale²)`

## Troubleshooting

### Development Server HTTPS Issues

#### Firefox SSL Error (SSL_ERROR_NO_CYPHER_OVERLAP)

Firefox is stricter about self-signed certificates. Solutions:

**Option 1: Accept Certificate in Firefox**
1. Click "Advanced" on the error page
2. Click "Accept the Risk and Continue" (if available)
3. If not available, go to `about:preferences#privacy` → Security → Certificates → View Certificates
4. Add exception for `localhost:5173`

**Option 2: Use Chrome or Safari for Development**
- Chrome and Safari handle Vite's self-signed certificates more gracefully
- For production testing, use the deployed HTTPS version

**Option 3: Use mkcert for Trusted Local Certificates** (Recommended)
```bash
# Install mkcert
brew install mkcert  # macOS
# or: choco install mkcert  # Windows
# or: apt install mkcert  # Linux

# Run setup script
./setup-local-https.sh

# This will generate certificates and show instructions
# Then rename vite.config.ts to vite.config.old.ts
# and rename vite.config.mkcert.ts to vite.config.ts
```

Or manually:
```bash
# Install local CA
mkcert -install

# Generate certificates
mkcert localhost 127.0.0.1 ::1

# Rename files
mv localhost+2.pem cert.pem
mv localhost+2-key.pem cert-key.pem

# Use the mkcert config
mv vite.config.ts vite.config.default.ts
mv vite.config.mkcert.ts vite.config.ts
```

### Sensors Not Working

- **Check HTTPS**: Must be served over HTTPS
- **Check Permissions**: On iOS, ensure permission granted
- **Check Device**: Verify device has accelerometer/gyroscope
- **Check Browser**: Use Safari (iOS) or Chrome (Android)

### Permission Denied on iOS

- Go to Settings → Safari → Privacy & Security → Motion & Orientation Access
- Enable for the website
- Reload the page

### Measurements Unreliable

- **Check Stability**: Ensure "MEASURE OK" before starting session
- **Increase Session Duration**: Collect more samples
- **Adjust Thresholds**: Tune for your environment
- **Disable Motion Correction**: If scale has internal filtering

### High Error Bands

- **Reduce Motion**: Wait for calmer conditions
- **Increase Sample Count**: Longer measurement sessions
- **Check Scale Readings**: Ensure consistent input values

## License

GNU General Public License v3.0

## Support

For issues, questions, or contributions, please refer to the project repository.

