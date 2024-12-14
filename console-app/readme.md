### Install Node.js LTS (22.x)
https://nodejs.org/en

### Install Mongo

Follow https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/


### Prepare
In the project folder `console-app` run
```
npm install
```

### Start the service on Ubuntu

https://chatgpt.com/share/675e03ee-2798-8004-ab45-8549c3cc4558


1. Create a Systemd Service File
   Open a terminal and create a new service file:

```
sudo nano /etc/systemd/system/binance-web-sockets.service
```

Add the following content to the file, replacing placeholders with your app's details:

```
[Unit]
Description=Binance Web Sockets Service
After=network.target

[Service]
ExecStart=npm run start
WorkingDirectory=PROJECT_PATH/console-app
Restart=always
RestartSec=10
User=your-username
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```


```
sudo systemctl daemon-reload
sudo systemctl enable binance-web-sockets
sudo systemctl start binance-web-sockets
sudo systemctl status binance-web-sockets
```

