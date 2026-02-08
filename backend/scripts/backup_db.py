import os
import subprocess
import datetime
import boto3
from app.core.config import settings

def backup_database():
    """
    Dumps the PostgreSQL database, compresses it, and uploads to S3.
    Requires pg_dump to be installed and available in PATH.
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{settings.POSTGRES_DB}_{timestamp}.sql.gz"
    
    # Ensure backups directory exists
    os.makedirs("backups", exist_ok=True)
    backup_path = os.path.join("backups", backup_file)

    # Construct pg_dump command
    # PGPASSWORD environment variable is used to avoid interactive password prompt
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

    # Command: pg_dump -h <host> -U <user> <db> | gzip > <file>
    # Note: On Windows, piping in subprocess shell can be tricky, so we'll do it in Python?
    # Or just use -f with compression if pg_dump supports it (z level). 
    # Standard pg_dump -Z is compression level (0-9).
    
    try:
        print(f"Starting backup for {settings.POSTGRES_DB}...")
        
        # Using -F c (custom format) which is compressed by default and flexible
        cmd = [
            "pg_dump",
            "-h", settings.POSTGRES_SERVER,
            "-U", settings.POSTGRES_USER,
            "-F", "c", # Custom format, compressed
            "-f", backup_path,
            settings.POSTGRES_DB
        ]
        
        subprocess.run(cmd, env=env, check=True)
        print(f"Backup created locally: {backup_path}")

        # Upload to S3
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            print("Uploading to S3...")
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
                endpoint_url=settings.AWS_ENDPOINT_URL
            )
            
            s3_key = f"db_backups/{backup_file}"
            s3.upload_file(backup_path, settings.S3_BUCKET, s3_key)
            print(f"Uploaded to s3://{settings.S3_BUCKET}/{s3_key}")
            
            # Clean up local file after upload
            os.remove(backup_path)
            print("Local backup file removed.")
        else:
            print("AWS credentials not configured. Backup remains local.")

    except subprocess.CalledProcessError as e:
        print(f"Error during pg_dump: {e}")
        raise
    except Exception as e:
        print(f"Backup failed: {e}")
        raise

if __name__ == "__main__":
    backup_database()
