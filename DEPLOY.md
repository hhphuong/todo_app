# Todo Calendar App - Ubuntu Deployment

## Quick Deploy

```bash
# 1. Copy project to Ubuntu server
scp -r TODOAPP user@server:/home/user/

# 2. SSH to server
ssh user@server

# 3. Run deploy script
cd /home/user/TODOAPP
chmod +x deploy.sh
./deploy.sh
```

## Requirements
- Ubuntu 20.04+ 
- Open port 8080

## Commands

| Action | Command |
|--------|---------|
| Status | `sudo systemctl status todoapp` |
| Stop | `sudo systemctl stop todoapp` |
| Start | `sudo systemctl start todoapp` |
| Restart | `sudo systemctl restart todoapp` |
| Logs | `sudo journalctl -u todoapp -f` |

## Update After Code Changes

```bash
./update.sh
```

## Access
- Local: http://localhost:8080
- External: http://YOUR_SERVER_IP:8080
