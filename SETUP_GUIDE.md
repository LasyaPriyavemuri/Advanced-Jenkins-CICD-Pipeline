# Jenkins CI/CD Pipeline – Complete Setup Guide (From Zero)

Goal: Push code to GitHub → Jenkins auto-detects → builds → tests → (optional) dockerizes → auto-deploys to AWS EC2.

---

## STEP 0: What you need ready
- GitHub account
- AWS account (free tier is fine)
- (Optional) Docker Hub account

---

## STEP 1: Create GitHub Repository

1. Go to github.com → New Repository → name it `jenkins-cicd-demo`
2. Upload these 3 files (provided in this chat): `app/app.js`, `app/package.json`, `app/Dockerfile`, and `Jenkinsfile` (keep folder structure same)
3. Note your repo URL: `https://github.com/<your-username>/jenkins-cicd-demo.git`

```bash
# OR push from your local machine
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/jenkins-cicd-demo.git
git push -u origin main
```

---

## STEP 2: Launch AWS EC2 Instance (this will run Jenkins)

1. AWS Console → EC2 → Launch Instance
2. Name: `jenkins-server`
3. AMI: **Ubuntu Server 22.04 LTS**
4. Instance type: **t2.medium** (t2.micro works but is slow for Jenkins)
5. Key pair: Create new → download `.pem` file (keep safe, needed for SSH)
6. Network settings → Edit security group → Add these inbound rules:
   - SSH (port 22) – your IP
   - Custom TCP (port 8080) – anywhere (for Jenkins UI)
   - HTTP (port 80) – anywhere (for the deployed app)
7. Launch instance, copy its **Public IPv4 address**

---

## STEP 3: Install Jenkins on the EC2 instance

SSH into the instance:
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Run these commands on the server:
```bash
# Update
sudo apt update -y

# Install Java (Jenkins needs it)
sudo apt install -y fontconfig openjdk-17-jre

# Add Jenkins repo and install
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update -y
sudo apt install -y jenkins

# Start Jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Install Docker (optional, for containerized deploy)
sudo apt install -y docker.io
sudo usermod -aG docker jenkins
sudo usermod -aG docker ubuntu
sudo systemctl restart jenkins
```

---

## STEP 4: Open Jenkins in browser

1. Go to: `http://<EC2_PUBLIC_IP>:8080`
2. Get the initial admin password:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
3. Paste it in the browser → Install suggested plugins → Create admin user

---

## STEP 5: Install required Jenkins plugins

Manage Jenkins → Plugins → Available plugins → install:
- **Git plugin** (usually pre-installed)
- **Pipeline plugin** (usually pre-installed)
- **Docker Pipeline**
- **SSH Agent**
- **GitHub Integration plugin**

---

## STEP 6: Add credentials in Jenkins

Manage Jenkins → Credentials → System → Global credentials → Add Credentials:

1. **Docker Hub** (if using Docker):
   - Kind: Username with password
   - ID: `dockerhub-creds`
   - Username/Password: your Docker Hub login

2. **EC2 SSH key** (for deployment server, can be same or different instance):
   - Kind: SSH Username with private key
   - ID: `ec2-ssh-key`
   - Username: `ec2-user` (or `ubuntu`)
   - Private key: paste contents of your `.pem` file

---

## STEP 7: Create the Pipeline Job

1. Jenkins Dashboard → New Item → name it `jenkins-cicd-demo` → select **Pipeline** → OK
2. Under **Pipeline** section:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: your GitHub repo URL
   - Branch: `main`
   - Script Path: `Jenkinsfile`
3. Save

---

## STEP 8: Edit the Jenkinsfile placeholders

Open the `Jenkinsfile` (already created for you) and replace:
- `yourdockerhubusername/jenkins-cicd-demo` → your actual Docker Hub repo name
- `<your-username>/<your-repo>` → your GitHub repo path
- `<YOUR_EC2_PUBLIC_IP>` → your deployment server's IP (can be same Jenkins server or a separate one)

Commit and push this change to GitHub.

---

## STEP 9: Set up automatic trigger (GitHub Webhook)

This is what makes it **fully automatic** — push code → pipeline runs by itself.

**On GitHub:**
1. Go to your repo → Settings → Webhooks → Add webhook
2. Payload URL: `http://<EC2_PUBLIC_IP>:8080/github-webhook/`
3. Content type: `application/json`
4. Trigger on: "Just the push event"
5. Save

**On Jenkins:**
1. Open your pipeline job → Configure
2. Under "Build Triggers" → check **"GitHub hook trigger for GITScm polling"**
3. Save

---

## STEP 10: Test it

1. Make a small change locally (e.g., edit the message in `app.js`)
2. ```bash
   git add .
   git commit -m "test auto deploy"
   git push
   ```
3. Watch Jenkins Dashboard → your job should start building **automatically** within seconds
4. After pipeline finishes, open `http://<EC2_PUBLIC_IP>` (port 80) — you should see your updated app live

---

## How it all connects (flow)

```
Developer pushes code to GitHub
        ↓ (webhook notifies)
Jenkins detects the change automatically
        ↓
Jenkins pulls latest code (Checkout stage)
        ↓
Installs dependencies + runs tests
        ↓
Builds Docker image (optional)
        ↓
Pushes image to Docker Hub (optional)
        ↓
SSHs into AWS EC2 and deploys the new container
        ↓
App is live and updated — no manual steps
```

---

## If you DON'T want to use Docker (simpler version)

Skip the "Build Docker Image" and "Push to Docker Hub" stages in the Jenkinsfile. Replace "Deploy to AWS EC2" stage with directly copying files and restarting the app via `pm2` or `systemd` over SSH instead of `docker run`.

---

## Common issues & fixes

| Problem | Fix |
|---|---|
| Jenkins UI not loading on port 8080 | Check EC2 security group allows port 8080 |
| `docker: permission denied` | Run `sudo usermod -aG docker jenkins` then restart Jenkins |
| Webhook not triggering build | Check Jenkins job has "GitHub hook trigger" enabled, and security group allows inbound from GitHub |
| `npm: command not found` | Install Node.js on the Jenkins server: `sudo apt install -y nodejs npm` |
| SSH deploy fails | Verify `ec2-ssh-key` credential and EC2_HOST value in Jenkinsfile are correct |
