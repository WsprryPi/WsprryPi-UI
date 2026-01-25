# `mkcert` Installation on Raspberry Pi 32-bit

1. **Update package lists & install prerequisites**

    ```bash
    sudo apt update
    sudo apt install -y libnss3-tools ca-certificates
    ```

1. **Download the prebuilt ARM binary (v1.4.3)**

    ```bash
    VERSION=1.4.3
    wget https://github.com/FiloSottile/mkcert/releases/download/v$VERSION/mkcert-v$VERSION-linux-arm
    ```

1. **Make it executable & install it system-wide**

    ```bash
    chmod +x mkcert-v$VERSION-linux-arm
    sudo mv mkcert-v$VERSION-linux-arm /usr/local/bin/mkcert
    ```

1. **Verify installation & install the local CA**

    ```bash
    mkcert --version
    sudo mkcert -install
    ```

1. **Generate certificates for your local hostnames**

    ```bash
    # For a single hostname
    mkcert wspr.local
    ```

1. **Configure Apache to use the `mkcert` certificates**

    ```bash
    # Create a directory for mkcert certs
    sudo mkdir -p /etc/ssl/mkcert

    # Copy generated cert and key
    sudo cp wspr.local.pem wspr.local-key.pem /etc/ssl/mkcert/
    sudo chown root:root /etc/ssl/mkcert/wspr.local*.pem
    sudo chmod 644 /etc/ssl/mkcert/wspr.local.pem
    sudo chmod 600 /etc/ssl/mkcert/wspr.local-key.pem

    # Enable SSL and default SSL site
    sudo a2enmod ssl
    sudo a2ensite default-ssl

    # Create your HTTPS VirtualHost
    cat <<EOF | sudo tee /etc/apache2/sites-available/wspr.local.conf
    <IfModule mod_ssl.c>
        <VirtualHost *:443>
        ServerName wspr.local

        DocumentRoot /var/www/wspr
        <Directory /var/www/wspr>
            Options Indexes FollowSymLinks
            AllowOverride All
            Require all granted
        </Directory>

        SSLEngine on
        SSLCertificateFile      /etc/ssl/mkcert/wspr.local.pem
        SSLCertificateKeyFile   /etc/ssl/mkcert/wspr.local-key.pem

        SSLOptions       +StrictRequire
        SSLProtocol      all -SSLv3 -TLSv1 -TLSv1.1
        SSLHonorCipherOrder on
        </VirtualHost>
    </IfModule>
    EOF

    # Enable your site & reload Apache
    sudo a2ensite wspr.local
    sudo systemctl reload apache2
    ```

---

**Optional: Building the latest mkcert yourself**

```bash
sudo apt install -y golang-go libnss3-tools
git clone https://github.com/FiloSottile/mkcert.git
cd mkcert
# Use GOARM=6 to target all Pi models
GOARM=6 GOOS=linux GOARCH=arm go build -o mkcert
sudo mv mkcert /usr/local/bin/
mkcert -install
```
