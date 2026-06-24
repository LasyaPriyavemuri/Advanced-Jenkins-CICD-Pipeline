pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "yourdockerhubusername/jenkins-cicd-demo"
        IMAGE_TAG    = "${env.BUILD_NUMBER}"
        AWS_REGION   = "ap-south-1"
        EC2_HOST     = "ec2-user@<YOUR_EC2_PUBLIC_IP>"
    }

    stages {

        stage('Checkout Code') {
            steps {
                // Pulls latest code from GitHub automatically when triggered
                git branch: 'main', url: 'https://github.com/<your-username>/<your-repo>.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('app') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('app') {
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                dir('app') {
                    sh "docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} ."
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
                    sh "docker push ${DOCKER_IMAGE}:${IMAGE_TAG}"
                }
            }
        }

        stage('Deploy to AWS EC2') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_HOST} '
                            docker pull ${DOCKER_IMAGE}:${IMAGE_TAG} &&
                            docker stop demo-app || true &&
                            docker rm demo-app || true &&
                            docker run -d --name demo-app -p 80:3000 ${DOCKER_IMAGE}:${IMAGE_TAG}
                        '
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully! App deployed to AWS.'
        }
        failure {
            echo 'Pipeline failed. Check logs above.'
        }
    }
}
