const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function execute(command) {
    try {
        const { stdout, stderr } = await exec(command);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
      } catch (e) {
        console.error(e);
      }
}

async function addRootCACert(serverIp) {
    await execute(
        `
        cd /etc/ipsec.d
        ipsec pki --gen --type rsa --size 4096 --outform pem > /etc/ipsec.d/private/ca.pem
        ipsec pki --self --ca --lifetime 3650 --in /etc/ipsec.d/private/ca.pem \
        --type rsa --digest sha256 \
        --dn "CN=${serverIp}" \
        --outform pem > /etc/ipsec.d/cacerts/ca.pem
        `
    )
}


async function addServerCert(serverIp) {
    await execute(
        `
        ipsec pki --gen --type rsa --size 4096 --outform pem > /etc/ipsec.d/private/debian.pem
        ipsec pki --pub --in /etc/ipsec.d/private/debian.pem --type rsa |
        ipsec pki --issue --lifetime 3650 --digest sha256 \
        --cacert /etc/ipsec.d/cacerts/ca.pem --cakey /etc/ipsec.d/private/ca.pem \
        --dn "CN=${serverIp}" \
        --san ${serverIp} \
        --flag serverAuth --outform pem > /etc/ipsec.d/certs/debian.pem
        `
    )
}

async function addClientCert(name) {

    var certName = name.replace(/\s+/g, '-').toLowerCase();

    await execute(
    `
    ipsec pki --gen --type rsa --size 4096 --outform pem > /etc/ipsec.d/private/${certName}.pem
    ipsec pki --pub --in /etc/ipsec.d/private/${certName}.pem --type rsa |
    ipsec pki --issue --lifetime 3650 --digest sha256 \
    --cacert /etc/ipsec.d/cacerts/ca.pem --cakey /etc/ipsec.d/private/ca.pem \
    --dn "CN=${name}" --san me \
    --flag clientAuth \
    --outform pem > /etc/ipsec.d/certs/${certName}.pem \
    `);
}

async function addMobileConfig(client, serverIp) {

    var certName = client.replace(/\s+/g, '-').toLowerCase();

    await execute(
        `./mobileconfig.sh ${certName} ${serverIp} > iphone.mobileconfig`
    );
}
