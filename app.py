import os
import sys

# Windows Anaconda OpenSSL DLL directory setup
anaconda_path = r"C:\Users\hola_\anaconda3\Library\bin"
if os.path.exists(anaconda_path):
    os.environ["PATH"] = anaconda_path + os.pathsep + os.environ["PATH"]

from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
import re
import hashlib
from html import unescape
import time

app = Flask(__name__)

# Simple in-memory cache
cache = {
    'data': None,
    'expiry': 0
}
CACHE_DURATION = 300 # 5 minutes

def clean_html_to_text(html_content):
    """Convert HTML string to plain text for tweet generation."""
    # Replace links with their text representation
    # e.g., <a href="...">Link Text</a> -> Link Text
    text = re.sub(r'<a\s+[^>]*>(.*?)</a>', r'\1', html_content)
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities like &amp;, &lt;, &gt;, &quot;, &#39;
    text = unescape(text)
    # Collapse multiple whitespaces and newlines
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def add_target_blank(html_content):
    """Add target="_blank" and rel="noopener noreferrer" to all anchor tags."""
    # Find all anchor tags and insert target and rel attributes
    def replacer(match):
        tag = match.group(0)
        if 'target=' not in tag:
            tag = tag.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ')
        return tag
    return re.sub(r'<a\s+[^>]*>', replacer, html_content)

def fetch_and_parse_feed(force_refresh=False):
    """Fetch the feed from Google and parse it into individual granular updates."""
    global cache
    now = time.time()
    
    if not force_refresh and cache['data'] and now < cache['expiry']:
        return cache['data'], "cached"
        
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    all_updates = []
    
    for entry in entries:
        date_title = entry.find('atom:title', ns).text
        updated_time = entry.find('atom:updated', ns).text
        link_elem = entry.find('atom:link', ns)
        entry_link = link_elem.attrib.get('href') if link_elem is not None else ""
        content_elem = entry.find('atom:content', ns)
        html_content = content_elem.text if content_elem is not None else ""
        
        # Split entry content by <h3> headers
        parts = re.split(r'<h3>(.*?)</h3>', html_content)
        
        if len(parts) > 1:
            for j in range(1, len(parts), 2):
                update_type = parts[j].strip()
                update_html = parts[j+1].strip() if j+1 < len(parts) else ""
                
                # Add target="_blank" to links in the HTML
                update_html_formatted = add_target_blank(update_html)
                
                # Clean HTML to text for tweets
                plain_text = clean_html_to_text(update_html)
                
                # Generate unique ID based on date, type and content
                content_hash = hashlib.md5(f"{date_title}-{update_type}-{plain_text}".encode('utf-8')).hexdigest()
                
                # Create default tweet text (limiting plain text snippet to ~140 chars to fit 280-char limit)
                # Twitter intent links count URL characters, so keeping text concise is key.
                max_text_len = 140
                text_snippet = plain_text
                if len(text_snippet) > max_text_len:
                    text_snippet = text_snippet[:max_text_len-3] + "..."
                
                tweet_text = f"BigQuery {update_type} ({date_title}): {text_snippet}"
                
                all_updates.append({
                    'id': content_hash,
                    'date': date_title,
                    'updated': updated_time,
                    'type': update_type,
                    'content_html': update_html_formatted,
                    'content_text': plain_text,
                    'tweet_text': tweet_text,
                    'link': entry_link
                })
        else:
            # Fallback if no <h3> tags are found
            if html_content.strip():
                update_html_formatted = add_target_blank(html_content)
                plain_text = clean_html_to_text(html_content)
                content_hash = hashlib.md5(f"{date_title}-General-{plain_text}".encode('utf-8')).hexdigest()
                
                max_text_len = 140
                text_snippet = plain_text
                if len(text_snippet) > max_text_len:
                    text_snippet = text_snippet[:max_text_len-3] + "..."
                tweet_text = f"BigQuery Update ({date_title}): {text_snippet}"
                
                all_updates.append({
                    'id': content_hash,
                    'date': date_title,
                    'updated': updated_time,
                    'type': 'General',
                    'content_html': update_html_formatted,
                    'content_text': plain_text,
                    'tweet_text': tweet_text,
                    'link': entry_link
                })
                
    # Update cache
    cache['data'] = all_updates
    cache['expiry'] = now + CACHE_DURATION
    return all_updates, "live"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes, status = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'source': status,
            'count': len(notes),
            'notes': notes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Default Flask port is 5000
    app.run(debug=True, port=5000)
