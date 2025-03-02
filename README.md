

* * * * *

Snail-Url
=====================================

This repository provides a **containerized** version of the [Snail-Url Extended] script. The Docker image bundles all necessary reconnaissance tools (Subfinder, WaybackURLs, Gau, Unfurl, ParamSpider, etc.) and Python dependencies, so you can easily check for **open-redirect** vulnerabilities on any target domain.

Features
--------

-   **Domain-Based Filtering**: Skips internal (same-domain) redirects to reduce false positives.
-   **Active Verification**: Actively tests suspicious parameters by redirecting them to a custom test domain.
-   **JSON Reporting**: Optionally export confirmed open redirects as structured JSON.
-   **ASCII-Art Banner**: Includes a custom banner for flair.
-   **All Tools Pre-installed**: No need to install Subfinder, WaybackURLs, ParamSpider, etc. locally.

File Structure
--------------

```
snail_url_container/
├── Dockerfile
└── snail_url_extended.py

```

-   **Dockerfile**: Multi-stage build configuration.
-   **snail_url_extended.py**: Python script with extended functionality.

Quick Start
-----------

1.  **Clone** or download this repository (the `snail_url_container` folder).

2.  **Build** the Docker image:

    ```
    cd snail_url_container
    docker build -t snailurl:latest .

    ```

3.  **Run** a scan against your target domain. For example:

    ```
    docker run --rm snailurl:latest -d example.com

    ```

    By default, all output files (`snail_open_redirects.txt`, `snail_url.log`, etc.) stay inside the container.

Persisting Output Locally
-------------------------

To save scan results on your host machine, **mount a directory**:

1.  Create an `output/` directory on your host:

    ```
    mkdir output

    ```

2.  Run Docker with the volume mapping:

    ```
    docker run --rm\
        -v "$(pwd)/output":/app/output\
        snailurl:latest\
        -d example.com\
        -o /app/output/snail_open_redirects.txt\
        --json-out /app/output/confirmed_redirects.json

    ```

3.  After the container finishes, check the `output/` folder for:

    -   `snail_open_redirects.txt`
    -   `confirmed_redirects.json` (if requested)
    -   `snail_url.log`

Script Usage
------------

You can pass additional arguments to **snail_url_extended.py** as desired:

```
usage: snail_url_extended.py -d <domain> [options]

Options:
  -d, --domain        Target domain (e.g., example.com)
  -o, --output        Text file for unverified open redirects (default: snail_open_redirects.txt)
  --json-out          JSON file to store verified results (e.g., confirmed_redirects.json)
  --test-domain       Domain to inject for verifying open redirects (default: https://attacker.com/unique-test)

```

**Examples**:

-   **Basic**:

    ```
    docker run --rm snailurl:latest -d example.com

    ```

-   **Generate JSON Output**:

    ```
    docker run --rm\
        -v "$(pwd)/output":/app/output\
        snailurl:latest\
        -d example.com\
        --json-out /app/output/confirmed_redirects.json

    ```

Checking Included Tools
-----------------------

Enter the container interactively:

```
docker run --rm -it snailurl:latest /bin/bash

```

Then run commands like:

```
subfinder -h
waybackurls -h
paramspider -h
gau -h
unfurl -h

```

FAQ
---

### 1\. What if I don't want to automatically install tools?

Inside the container, all tools are already installed at build time, so no further installation is performed when you run. If you run the script **outside** of Docker, the script attempts to auto-install missing tools, but this is not needed when using the container.

### 2\. Why use a multi-stage Docker build?

It helps keep the final image smaller. We compile Go-based tools in one layer, then copy only the built binaries into a slim Python image.

### 3\. How do I enable concurrency for larger scans?

This version is synchronous for clarity. You can add threading or `asyncio` in `snail_url_extended.py` to parallelize verification calls. Rebuild the Docker image afterward.

* * * * *

License
-------
 MIT
 
Contributing
------------

Feel free to open issues or pull requests if you'd like to contribute improvements, such as concurrency, advanced URL parsing, or additional reporting formats.
