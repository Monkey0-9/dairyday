"""
S3/MinIO uploader service for DairyOS.
Handles file uploads and presigned URL generation.
"""

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
import io
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

MIME_WHITELIST = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/json",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB default


def get_s3_client():
    """
    Get configured S3 client.

    Returns:
        boto3 S3 client configured for MinIO or AWS S3
    """
    config = Config(
        signature_version="s3v4",
        s3={'addressing_style': 'path'}
    )

    if settings.AWS_ENDPOINT_URL:
        # MinIO or S3-compatible storage
        return boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or "minioadmin",
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or "minioadmin",
            endpoint_url=settings.AWS_ENDPOINT_URL,
            config=config,
            region_name=settings.AWS_REGION or "us-east-1",
        )
    else:
        # AWS S3
        return boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=config,
            region_name=settings.AWS_REGION,
        )


def upload_file_to_s3(
    file_obj: io.BytesIO,
    bucket_name: str,
    object_name: str,
    content_type: str = "application/pdf"
) -> str:
    """
    Upload a file to S3 bucket.

    Args:
        file_obj: File content as BytesIO
        bucket_name: S3 bucket name
        object_name: Object key (path) in bucket
        content_type: MIME type of the file

    Returns:
        URL of the uploaded file

    Raises:
        ValueError: If file metadata is invalid
        ClientError: If upload fails
    """
    # 1. Validation
    if content_type not in MIME_WHITELIST:
        raise ValueError(f"Unsupported MIME type: {content_type}")
    
    file_size = len(file_obj.getvalue())
    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"File size {file_size} exceeds limit {MAX_FILE_SIZE}")

    client = get_s3_client()

    try:
        client.put_object(
            Bucket=bucket_name,
            Key=object_name,
            Body=file_obj.getvalue(),
            ContentType=content_type,
            Metadata={
                "dairy-app": "invoice",
                "uploaded-at": "auto"
            }
        )

        # Return public URL or presigned URL
        if settings.AWS_ENDPOINT_URL:
            # MinIO or compatible - return direct URL
            endpoint = settings.AWS_ENDPOINT_URL.rstrip('/')
            return f"{endpoint}/{bucket_name}/{object_name}"
        else:
            # AWS S3 - return public URL format
            return f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{object_name}"

    except ClientError as e:
        logger.exception("S3 upload failed for key %s: %s", object_name, e)
        raise


def generate_presigned_url(
    bucket_name: str,
    object_name: str,
    expiration: int = 3600,
    method: str = "get_object"
) -> str:
    """
    Generate a presigned URL for S3 object access.

    Args:
        bucket_name: S3 bucket name
        object_name: Object key in bucket
        expiration: URL validity in seconds (default 1 hour)
        method: HTTP method for the URL ('get_object' or 'put_object')

    Returns:
        Presigned URL string

    Raises:
        ClientError: If URL generation fails
    """
    client = get_s3_client()

    try:
        params = {
            "Bucket": bucket_name,
            "Key": object_name,
        }

        return client.generate_presigned_url(
            method,
            Params=params,
            ExpiresIn=expiration,
        )
    except ClientError as e:
        logger.exception("Presign URL generation failed for key %s: %s", object_name, e)
        raise


def get_object_url(bucket_name: str, object_name: str) -> str:
    """
    Get the direct URL for an S3 object.

    For private buckets, this would need presigned URLs.
    For public buckets, this returns the direct URL.

    Args:
        bucket_name: S3 bucket name
        object_name: Object key in bucket

    Returns:
        URL string for the object
    """
    if settings.AWS_ENDPOINT_URL:
        endpoint = settings.AWS_ENDPOINT_URL.rstrip('/')
        return f"{endpoint}/{bucket_name}/{object_name}"
    else:
        return f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{object_name}"


def check_object_exists(bucket_name: str, object_name: str) -> bool:
    """
    Check if an object exists in S3.

    Args:
        bucket_name: S3 bucket name
        object_name: Object key in bucket

    Returns:
        True if object exists, False otherwise
    """
    client = get_s3_client()

    try:
        client.head_object(Bucket=bucket_name, Key=object_name)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            return False
        logger.exception("Error checking object %s: %s", object_name, e)
        raise


def upload_json_to_s3(data: dict, bucket_name: str, object_name: str) -> str:
    """
    Upload a small JSON payload to S3 and return its URL.
    """
    # Serialize to bytes
    buffer = io.BytesIO(json.dumps(data).encode("utf-8"))
    return upload_file_to_s3(
        file_obj=buffer,
        bucket_name=bucket_name,
        object_name=object_name,
        content_type="application/json",
    )


def delete_object(bucket_name: str, object_name: str) -> bool:
    """
    Delete an object from S3.

    Args:
        bucket_name: S3 bucket name
        object_name: Object key in bucket

    Returns:
        True if deleted successfully
    """
    client = get_s3_client()

    try:
        client.delete_object(Bucket=bucket_name, Key=object_name)
        logger.info("Deleted object: %s/%s", bucket_name, object_name)
        return True
    except ClientError as e:
        logger.exception("Failed to delete object %s: %s", object_name, e)
        raise


def list_objects(bucket_name: str, prefix: str = "", max_keys: int = 1000) -> list:
    """
    List objects in an S3 bucket with optional prefix.

    Args:
        bucket_name: S3 bucket name
        prefix: Optional prefix to filter objects
        max_keys: Maximum number of keys to return

    Returns:
        List of object keys
    """
    client = get_s3_client()

    try:
        response = client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            MaxKeys=max_keys,
        )

        objects = response.get("Contents", [])
        return [obj["Key"] for obj in objects]

    except ClientError as e:
        logger.exception("Failed to list objects with prefix %s: %s", prefix, e)
        raise

