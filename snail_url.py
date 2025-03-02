#!/usr/bin/env python3
"""
snail_url_extended.py
Author: YourName
Description:
    An expanded version of Snail-Url with:
      1. Domain-based filtering (to skip internal redirects).
      2. Active verification of potential open redirects (via HTTP 3xx check).
      3. JSON reporting of confirmed findings.
      4. Persistent logging to snail_url.log.

Usage:
    python3 snail_url_extended.py -d <domain> [options]

Examples:
    python3 snail_url_extended.py -d example.com
    python3 snail_url_extended.py -d example.com -o results.txt --json-out confirmed_redirects.json

Dependencies:
    - subfinder
    - waybackurls
    - paramspider
    - (optional) gau
    - (optional) unfurl
    - Python packages: requests (for verification)

License: MIT or your chosen license
"""

import argparse
import logging
import os
import re
import subprocess
import sys
import tempfile
import time
import json
from urllib.parse import urlparse, unquote

try:
    import requests
except ImportError:
    print("[!] 'requests' library not found. Please install it (e.g., pip3 install requests).")
    sys.exit(1)

# New ASCII-Art Banner
BANNER = r"""
/* ++----------------------------------------------------------++ */
/* ++----------------------------------------------------------++ */
/* || ________  ________   ________  ___  ___                  || */
/* |||\   ____\|\   ___  \|\   __  \|\  \|\  \                 || */
/* ||\ \  \___|\ \  \\ \  \ \  \|\  \ \  \ \  \                || */
/* || \ \_____  \ \  \\ \  \ \   __  \ \  \ \  \               || */
/* ||  \|____|\  \ \  \\ \  \ \  \ \  \ \  \ \  \____          || */
/* ||    ____\_\  \ \__\\ \__\ \__\ \__\ \__\ \_______\        || */
/* ||   |\_________\|__| \|__|\|__|\|__|\|__|\|_______|        || */
/* ||   \|_________|                                           || */
/* ||                                                          || */
/* ||                                                          || */
/* ||              ___  ___  ________  ___                     || */
/* ||             |\  \|\  \|\   __  \|\  \                    || */
/* || ____________\ \  \\\  \ \  \|\  \ \  \                   || */
/* |||\____________\ \  \\\  \ \   _  _\ \  \                  || */
/* ||\|____________|\ \  \\\  \ \  \\  \\ \  \____  ___        || */
/* ||                \ \_______\ \__\\ _\\ \_______\\__\       || */
/* ||                 \|_______|\|__|\|__|\|_______\|__|       || */
/* ||                                                          || */
/* ++----------------------------------------------------------++ */
/* ++----------------------------------------------------------++ */
"""

# Common redirect parameters to look for
REDIRECT_PARAMS = [
    "url", "redirect", "redirect_uri", "redirectUrl",
    "return", "next", "dest", "destination", "out",
    "go", "target", "continue", "forward"
]

def setup_logger(logfile: str = "snail_url.log") -> logging.Logger:
    """
    Creates and configures a logger that writes to both console (stdout) and a file.
    """
    logger = logging.getLogger("SnailUrlExtendedLogger")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    # File handler (overwrites on each run)
    fh = logging.FileHandler(logfile, mode='w')
    fh.setLevel(logging.INFO)
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    return logger


def run_cmd(cmd: str, logger: logging.Logger = None) -> str:
    """
    Runs a shell command and returns its STDOUT as a string.
    Logs the command and any errors if a logger is provided.
    Raises RuntimeError if the command fails.
    """
    if logger:
        logger.info(f"Running command: {cmd}")
    result = subprocess.run(
        cmd, shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True
    )
    if result.returncode != 0:
        err_msg = f"Command failed: {cmd}\nError: {result.stderr}"
        if logger:
            logger.error(err_msg)
        raise RuntimeError(err_msg)
    return result.stdout


def tool_exists(tool_name: str) -> bool:
    """
    Check if a command-line tool is installed by calling `which <tool_name>`.
    """
    try:
        subprocess.run(["which", tool_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


def install_tool(tool_name: str, logger: logging.Logger) -> bool:
    """
    Best-effort approach to install certain tools automatically.
    For paramspider, tries pip; for subfinder, waybackurls, etc. tries go install.
    Returns True if installed, else False.
    """
    # For paramspider (Python-based)
    if tool_name.lower() == "paramspider":
        logger.info(f"Attempting to install {tool_name} via pip3...")
        try:
            out = run_cmd("pip3 install paramspider", logger=logger)
            if tool_exists("paramspider"):
                logger.info(f"Successfully installed {tool_name}.")
                return True
        except Exception as e:
            logger.warning(f"Failed to install {tool_name}: {e}")
        return False

    # For subfinder, waybackurls, gau, unfurl => 'go install'
    go_based_tools = {
        "subfinder": "github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
        "waybackurls": "github.com/tomnomnom/waybackurls@latest",
        "gau": "github.com/lc/gau@latest",
        "unfurl": "github.com/tomnomnom/unfurl@latest"
    }
    if tool_name in go_based_tools:
        if tool_exists("go"):
            repo_path = go_based_tools[tool_name]
            logger.info(f"Attempting to install {tool_name} via go: {repo_path}")
            try:
                run_cmd(f"go install {repo_path}", logger=logger)
                if tool_exists(tool_name):
                    logger.info(f"Successfully installed {tool_name} via go.")
                    return True
                else:
                    logger.warning(
                        f"Installed {tool_name} via go, but it's not in PATH.\n"
                        "You may need to add $(go env GOPATH)/bin to your PATH."
                    )
                    return False
            except Exception as e:
                logger.warning(f"Failed to install {tool_name} via go: {e}")
                return False
        else:
            logger.warning(f"Go is not installed; cannot install {tool_name} automatically.")
            return False

    # If we have no known method for this tool
    logger.warning(f"No known auto-install method for {tool_name}.")
    return False


def ensure_tool_installed(tool_name: str, logger: logging.Logger):
    """
    Ensures a given tool is installed; attempts auto-installation if missing.
    Raises RuntimeError if still missing after attempt.
    """
    if tool_exists(tool_name):
        logger.info(f"{tool_name} is already installed.")
    else:
        logger.info(f"{tool_name} not found. Attempting installation...")
        success = install_tool(tool_name, logger)
        if not success:
            msg = f"Could not install {tool_name} automatically. Please install it manually."
            logger.error(msg)
            raise RuntimeError(msg)


def is_same_domain(target_domain: str, redirect_url: str) -> bool:
    """
    Checks if redirect_url belongs to the same domain (or a subdomain) of target_domain.
    For example, if target_domain is 'example.com', anything under *.example.com 
    is considered internal.
    """
    parsed = urlparse(redirect_url)
    netloc = parsed.netloc.lower()
    if not netloc:
        # Possibly a relative path
        return True  # treat as same domain since there's no external domain

    td = target_domain.lower()
    if netloc == td:
        return True
    if netloc.endswith("." + td):
        return True

    return False


def decode_possible_url(encoded_url: str) -> str:
    """
    Decodes common encodings (URL-encoded). For advanced usage, 
    you could also try base64 or double-encoding detection.
    """
    decoded_once = unquote(encoded_url)
    decoded_twice = unquote(decoded_once)
    if decoded_twice != encoded_url:
        return decoded_twice
    else:
        return decoded_once


def verify_open_redirect(original_url: str, param_name: str, test_domain: str, logger: logging.Logger):
    """
    Actively verify if 'original_url' truly allows an open redirect on param 'param_name'.
    1. Replaces param_name's value with 'test_domain'.
    2. Sends an HTTP request without auto-follow.
    3. Checks if the response is a 3xx to 'test_domain'.
    Returns a dict with verification details.
    """
    parsed = urlparse(original_url)
    query_str = parsed.query
    if not query_str:
        return {
            "confirmed": False,
            "reason": "No query string present"
        }

    from urllib.parse import parse_qs, urlencode
    qs_dict = parse_qs(query_str, keep_blank_values=True)
    if param_name not in qs_dict:
        return {
            "confirmed": False,
            "reason": f"Parameter {param_name} not found"
        }

    qs_dict[param_name][0] = test_domain
    new_query = urlencode(qs_dict, doseq=True)
    new_url = parsed._replace(query=new_query).geturl()

    logger.info(f"[Active Verify] Testing redirect => {new_url}")

    try:
        resp = requests.get(new_url, allow_redirects=False, timeout=10)
    except requests.RequestException as e:
        return {
            "confirmed": False,
            "reason": f"HTTP error: {e}"
        }

    if 300 <= resp.status_code < 400:
        location_header = resp.headers.get("Location", "")
        if test_domain in location_header:
            return {
                "confirmed": True,
                "http_status": resp.status_code,
                "location_header": location_header,
                "reason": "3xx redirect to test domain"
            }
        else:
            return {
                "confirmed": False,
                "reason": f"Redirected, but not to {test_domain} (Location={location_header})"
            }
    else:
        return {
            "confirmed": False,
            "reason": f"Status={resp.status_code}, not a redirect"
        }


def main():
    logger = setup_logger("snail_url.log")

    # Print banner
    logger.info("\n" + BANNER + "\n")

    parser = argparse.ArgumentParser(
        description="Snail-Url Extended: Fewer false positives via domain checks + active verification."
    )
    parser.add_argument("-d", "--domain", required=True, help="Target domain, e.g. example.com")
    parser.add_argument("-o", "--output", default="snail_open_redirects.txt", help="Text file output for potential open redirects")
    parser.add_argument("--json-out", default=None, help="Optional JSON file to store verified results.")
    parser.add_argument("--test-domain", default="https://attacker.com/unique-test", 
                        help="Domain to inject for verifying open redirects. Must be external.")
    args = parser.parse_args()

    target_domain = args.domain
    output_file = args.output
    json_file = args.json_out
    test_domain = args.test_domain

    logger.info(f"Starting Snail-Url Extended on domain: {target_domain}")
    logger.info(f"Potential open redirects (unverified) => {output_file}")
    if json_file:
        logger.info(f"Verified open redirects (JSON) => {json_file}")

    # Step A: Ensure required tools (though in Docker they should be pre-installed)
    required_tools = ["subfinder", "waybackurls", "paramspider"]
    for tool in required_tools:
        ensure_tool_installed(tool, logger)

    # Optional tools
    gau_installed = tool_exists("gau")
    unfurl_installed = tool_exists("unfurl")

    # 1. Create a temp directory for intermediate files
    with tempfile.TemporaryDirectory() as tmpdir:
        logger.info(f"Temp working directory => {tmpdir}")
        subdomains_file = os.path.join(tmpdir, "subdomains.txt")
        wayback_file = os.path.join(tmpdir, "wayback.txt")
        paramspider_out = os.path.join(tmpdir, "paramspider.txt")
        combined_urls_file = os.path.join(tmpdir, "combined_urls.txt")
        redirect_candidates_file = os.path.join(tmpdir, "redirect_candidates.txt")

        # 2. Subdomain Enumeration
        logger.info("[Step 1] subfinder => enumerating subdomains...")
        cmd_subfinder = f"subfinder -d {target_domain} -silent -o {subdomains_file}"
        run_cmd(cmd_subfinder, logger)

        if not os.path.isfile(subdomains_file) or os.path.getsize(subdomains_file) == 0:
            logger.error("No subdomains found. Exiting.")
            sys.exit(1)

        sb_count = int(run_cmd(f"wc -l < {subdomains_file}", logger).strip())
        logger.info(f"[+] Subdomains found: {sb_count}")

        # 3. Gather URLs from waybackurls (plus gau if installed)
        logger.info("[Step 2] Gathering archived URLs (Wayback + optional Gau)...")
        run_cmd(f"cat {subdomains_file} | waybackurls > {wayback_file}", logger)
        if gau_installed:
            logger.info("Adding Gau results...")
            run_cmd(f"cat {subdomains_file} | gau >> {wayback_file}", logger)
        run_cmd(f"sort -u {wayback_file} -o {wayback_file}", logger)
        wb_count = int(run_cmd(f"wc -l < {wayback_file}", logger).strip())
        logger.info(f"[+] Unique URLs from archives: {wb_count}")

        # 4. ParamSpider
        logger.info("[Step 3] paramspider => enumerating parameter-based URLs...")
        paramspider_cmd = (
            f"paramspider --domain {target_domain} --subs True --level high "
            f"--exclude woff,css,js,png,svg,jpg --output {paramspider_out} "
            f"--url https://{target_domain} "
            f"-l {subdomains_file}"
        )
        try:
            run_cmd(paramspider_cmd, logger)
        except RuntimeError:
            logger.warning("ParamSpider encountered an error. Continuing anyway.")

        # Combine everything
        logger.info("Combining Wayback + ParamSpider results...")
        with open(combined_urls_file, "w") as outf:
            pass
        run_cmd(f"cat {wayback_file} >> {combined_urls_file}", logger)

        if os.path.isfile(paramspider_out) and os.path.getsize(paramspider_out) > 0:
            run_cmd(f"cat {paramspider_out} >> {combined_urls_file}", logger)
        run_cmd(f"sort -u {combined_urls_file} -o {combined_urls_file}", logger)

        total_combined = int(run_cmd(f"wc -l < {combined_urls_file}", logger).strip())
        logger.info(f"[+] Total unique URLs combined: {total_combined}")

        # 5. Filtering for redirect parameters (regex approach)
        logger.info("[Step 4] Filtering for potential open redirect parameters...")
        pattern_parts = [fr"{p}=" for p in REDIRECT_PARAMS]
        combined_pattern = "(" + "|".join(pattern_parts) + r")(http%3A|https%3A|http://|https://|//|%2F%2F)"
        grep_cmd = f"grep -Ei '{combined_pattern}' {combined_urls_file} > {redirect_candidates_file}"
        try:
            run_cmd(grep_cmd, logger)
        except RuntimeError:
            logger.warning("No matches found for potential open redirect parameters.")

        run_cmd(f"sort -u {redirect_candidates_file} -o {redirect_candidates_file}", logger)
        candidate_count = 0
        if os.path.isfile(redirect_candidates_file):
            candidate_count = int(run_cmd(f"wc -l < {redirect_candidates_file}", logger).strip())

        logger.info(f"[+] Potential open redirect candidates: {candidate_count}")

        if candidate_count == 0:
            logger.info("No potential redirect URLs found. Exiting.")
            open(output_file, "w").close()
            if json_file:
                with open(json_file, "w") as j:
                    j.write("[]")
            sys.exit(0)

        # 6. Domain-based filtering & active verification
        logger.info("[Step 5] Domain-based filtering + Active verification...")

        unverified_out_fh = open(output_file, "w")
        verified_findings = []

        with open(redirect_candidates_file, "r") as f:
            for line in f:
                url_line = line.strip()
                if not url_line:
                    continue

                parsed_url = urlparse(url_line)
                from urllib.parse import parse_qs
                qs = parse_qs(parsed_url.query, keep_blank_values=True)

                flagged_any = False
                for param in qs.keys():
                    if param.lower() in REDIRECT_PARAMS or any(
                        re.search(r"(http|%2f%2f|//)", v, re.IGNORECASE) for v in qs[param]
                    ):
                        flagged_any = True
                        original_val = qs[param][0]
                        decoded_val = decode_possible_url(original_val)

                        # Check if the domain is internal or external
                        if is_same_domain(target_domain, decoded_val):
                            unverified_out_fh.write(f"[Internal?] {url_line} (param={param} value={decoded_val})\n")
                            continue

                        # Active verification
                        result = verify_open_redirect(url_line, param, test_domain, logger)
                        if result.get("confirmed"):
                            verified_findings.append({
                                "original_url": url_line,
                                "parameter": param,
                                "test_domain": test_domain,
                                "http_status": result.get("http_status"),
                                "location_header": result.get("location_header"),
                                "note": "Confirmed open redirect"
                            })
                            unverified_out_fh.write(f"[CONFIRMED] {url_line} param={param}\n")
                        else:
                            reason = result.get("reason", "No reason")
                            unverified_out_fh.write(f"[NOT CONFIRMED] {url_line} param={param} => {reason}\n")

                if not flagged_any:
                    unverified_out_fh.write(f"[NO FLAGGED PARAM] {url_line}\n")

        unverified_out_fh.close()

        # 7. (Optional) Save verified findings to JSON
        if json_file:
            with open(json_file, "w") as jf:
                json.dump(verified_findings, jf, indent=2)
            logger.info(f"[+] Saved {len(verified_findings)} verified open redirect(s) to {json_file}")

        logger.info(f"Done! Potential issues listed in {output_file}. Confirmed issues: {len(verified_findings)}.")


if __name__ == "__main__":
    main()
