# StudyEdge_chime

Stand alone demo application of the Amazon Chime SDK for use in an observer mode.\
Professors can setup "Office Hours" having one on one meetings with each student.\
Other students placed in queue will be muted and camera off so that everyone sees just the professor and student who is "on deck". 

Project deploys to lambda serverless framework and is setup to eaisly integrate into another project. 

# Using the demo
launch https://myserver/professor.html to launch the professor page.\
Enter professor and click to launch Chime server.\
Copy the student join meeting link and send to users to join your session.\
Each student who joins will show up on the right hand side.\
To add a student "on deck" and have a one on one session, just click the student name.\
This will un-mute that student. When done, click on the next student or end meeting.

# Installation
Clone the repo
```
npm update
```
Make sure sam is installed:
```
sam --version
```
If not then
```
brew tap aws/tap
brew install aws-sam-cli
```
Create a file `env.json` to store the environment variables. These are only used locally.
```
{
    "MeetingIndexLambda": {
        "MYSQL_HOST": <mysql_host>,
        "MYSQL_USER": <mysql_username>,
        "MYSQL_PASSWORD": <mysql_password>
    },
    "MeetingJoinLambda": {
        "MYSQL_HOST": <mysql_host>,
        "MYSQL_USER": <mysql_username>,
        "MYSQL_PASSWORD": <mysql_password>
    },
    "GetAttendeesLambda": {
        "MYSQL_HOST": <mysql_host>,
        "MYSQL_USER": <mysql_username>,
        "MYSQL_PASSWORD": <mysql_password>
    },
    "OnDeckLambda": {
        "MYSQL_HOST": <mysql_host>,
        "MYSQL_USER": <mysql_username>,
        "MYSQL_PASSWORD": <mysql_password>,
        "PUSHER_APPID": <pusher_app_id>,
        "PUSHER_KEY": <pusher_key>,
        "PUSHER_SECRET": <pusher_secret>
    },
    "LoginStudentLambda": {
        "MYSQL_HOST": <mysql_host>,
        "MYSQL_USER": <mysql_username>,
        "MYSQL_PASSWORD": <mysql_password>,
        "PUSHER_APPID": <pusher_app_id>,
        "PUSHER_KEY": <pusher_key>,
        "PUSHER_SECRET": <pusher_secret>
    }
  }
```


# Build & Run the project locally:
```
sam build
sam local start-api --env-vars env.json
```
## Setup ngrok
We use ngrok to test the local Chime server using an iPad or smart phone\
ngrok gives you an externally accessable https address to your local http server\
Fire it up like this in a new terminal window in the same project folder /StudyEdge_chime\
```
./ngrok http 3000
```
Note: change 3000 to the port serverless is running on

Copy the forwarding address and paste it in\
Example:  https://0558b45e775f.ngrok.io/professor.html\
Nice! Now we have something accessible from outside


# Deploy to AWS Lambda
Ensure you have your local AWS environment variables\
The user who has AWS keys above needs AIMFullAccess permissions in order to do this:
```
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<aws_key>
export AWS_SECRET_ACCESS_KEY=<aws_secret>
```
The first time
```
sam deploy --guided
```
Each subsequent just do:
```
sam deploy
```
This will use the saved file samconfig.toml from the -—guided

On success you see something like this:
```
Key                 ApiURL
Description         API endpoint URL for Prod environment
Value               https://9qyxv4nelg.execute-api.us-east-1.amazonaws.com/Prod/
```
Log into AWS and edit each lambda function replacing environment vars `default` with the actual value.\
Just append professor.html to the end and launch
https://9qyxv4nelg.execute-api.us-east-1.amazonaws.com/Prod/professor.html
