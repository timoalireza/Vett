#!/usr/bin/env python3
"""
Instaloader Instagram Content Extractor
Extracts media, captions, and metadata from Instagram posts/reels using Instaloader.

Usage:
    python instaloader_extract.py <instagram_url> [--username USERNAME] [--password PASSWORD]

Output: JSON to stdout with extracted content
"""

import json
import sys
import os
import argparse
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List

try:
    import instaloader
except ImportError:
    print(json.dumps({
        "error": "instaloader not installed. Run: pip install instaloader",
        "success": False
    }), file=sys.stderr)
    sys.exit(1)


def extract_post_data(url: str, username: Optional[str] = None, password: Optional[str] = None) -> Dict[str, Any]:
    """
    Extract Instagram post/reel data using Instaloader.
    
    Args:
        url: Instagram post/reel URL
        username: Optional Instagram username for login (for private posts)
        password: Optional Instagram password for login
        
    Returns:
        Dictionary with extracted data or error information
    """
    try:
        # Create Instaloader instance
        loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            post_metadata_txt_pattern="",
            max_connection_attempts=3
        )
        
        # Login if credentials provided
        if username and password:
            try:
                loader.login(username, password)
            except instaloader.exceptions.BadCredentialsException:
                return {
                    "error": "Invalid Instagram credentials",
                    "success": False
                }
            except instaloader.exceptions.TwoFactorAuthRequiredException:
                return {
                    "error": "Two-factor authentication required. Please use Instagram Basic Display API instead.",
                    "success": False
                }
        
        # Extract shortcode from URL
        # URLs can be: https://www.instagram.com/p/SHORTCODE/ or https://www.instagram.com/reel/SHORTCODE/
        shortcode = None
        if "/p/" in url:
            shortcode = url.split("/p/")[1].split("/")[0].split("?")[0]
        elif "/reel/" in url:
            shortcode = url.split("/reel/")[1].split("/")[0].split("?")[0]
        else:
            return {
                "error": f"Invalid Instagram URL format: {url}",
                "success": False
            }
        
        if not shortcode:
            return {
                "error": "Could not extract shortcode from URL",
                "success": False
            }
        
        # Create temporary directory for downloads
        temp_dir = tempfile.mkdtemp(prefix="instaloader_")
        
        try:
            # Download post metadata
            post = instaloader.Post.from_shortcode(loader.context, shortcode)
            
            # Extract caption
            caption = post.caption if post.caption else ""
            
            # Extract author
            author = post.owner_username if post.owner_username else None
            
            # Extract hashtags from caption
            hashtags = []
            if caption:
                import re
                hashtag_pattern = r'#[\w]+'
                hashtags = list(set(re.findall(hashtag_pattern, caption)))
            
            # Extract media URLs
            image_urls: List[str] = []
            video_urls: List[str] = []
            
            if post.is_video:
                video_urls.append(post.video_url)
            else:
                # For carousel posts, get all images
                if post.typename == "GraphSidecar":
                    for node in post.get_sidecar_nodes():
                        if node.is_video:
                            video_urls.append(node.video_url)
                        else:
                            image_urls.append(node.display_url)
                else:
                    image_urls.append(post.url)
            
            # Download media files to temp directory
            downloaded_media: List[Dict[str, str]] = []
            
            # Download images
            for idx, img_url in enumerate(image_urls):
                try:
                    # Download image
                    filename = f"image_{idx + 1}.jpg"
                    filepath = os.path.join(temp_dir, filename)
                    
                    import urllib.request
                    urllib.request.urlretrieve(img_url, filepath)
                    
                    downloaded_media.append({
                        "type": "image",
                        "url": img_url,
                        "local_path": filepath,
                        "filename": filename
                    })
                except Exception as e:
                    print(f"Warning: Failed to download image {idx + 1}: {e}", file=sys.stderr)
            
            # Download videos
            for idx, vid_url in enumerate(video_urls):
                try:
                    filename = f"video_{idx + 1}.mp4"
                    filepath = os.path.join(temp_dir, filename)
                    
                    import urllib.request
                    urllib.request.urlretrieve(vid_url, filepath)
                    
                    downloaded_media.append({
                        "type": "video",
                        "url": vid_url,
                        "local_path": filepath,
                        "filename": filename
                    })
                except Exception as e:
                    print(f"Warning: Failed to download video {idx + 1}: {e}", file=sys.stderr)
            
            # Extract metadata
            result = {
                "success": True,
                "text": caption,
                "author": author,
                "author_url": f"https://instagram.com/{author}" if author else None,
                "hashtags": hashtags,
                "is_reel": post.is_video and "/reel/" in url,
                "is_video": post.is_video,
                "like_count": post.likes,
                "comment_count": post.comments,
                "timestamp": post.date_utc.isoformat() if post.date_utc else None,
                "image_urls": image_urls,
                "video_urls": video_urls,
                "media_files": downloaded_media,
                "shortcode": shortcode,
                "post_url": f"https://www.instagram.com/p/{shortcode}/"
            }
            
            return result
            
        except instaloader.exceptions.PostNotFoundException:
            return {
                "error": "Post not found. It may be private or deleted.",
                "success": False
            }
        except instaloader.exceptions.PrivateProfileNotFollowedException:
            return {
                "error": "Post is from a private profile that you don't follow. Login required.",
                "success": False
            }
        except Exception as e:
            return {
                "error": f"Failed to extract post: {str(e)}",
                "success": False
            }
        finally:
            # Keep temp directory for now - caller will clean it up
            # shutil.rmtree(temp_dir, ignore_errors=True)
            pass
            
    except Exception as e:
        return {
            "error": f"Instaloader extraction failed: {str(e)}",
            "success": False
        }


def main():
    parser = argparse.ArgumentParser(description="Extract Instagram content using Instaloader")
    parser.add_argument("url", help="Instagram post/reel URL")
    parser.add_argument("--username", help="Instagram username (optional, for private posts)")
    parser.add_argument("--password", help="Instagram password (optional, for private posts)")
    parser.add_argument("--temp-dir", help="Temporary directory for media downloads", default=None)
    
    args = parser.parse_args()
    
    # Get credentials from environment if not provided
    username = args.username or os.getenv("INSTAGRAM_USERNAME")
    password = args.password or os.getenv("INSTAGRAM_PASSWORD")
    
    result = extract_post_data(args.url, username, password)
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    # Exit with error code if failed
    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()

