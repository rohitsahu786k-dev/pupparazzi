const net = require('net');

const host = 'ep-lingering-shadow-ai2e160k-pooler.c-4.us-east-1.aws.neon.tech';
const port = 5432;

const client = new net.Socket();
console.log(`Connecting to ${host}:${port}...`);

client.connect(port, host, function() {
    console.log('Connected!');
    client.destroy(); 
});

client.on('error', function(err) {
    console.log('Error: ' + err.message);
});
