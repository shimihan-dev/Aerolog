const http = require('https');

function testFlight(flightNum, date) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'aerodatabox.p.rapidapi.com',
            path: `/flights/number/${flightNum}/${date}`,
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '1f363a64a1msha4534ae9ed74452p1e7450jsnc9e9ad7f8641',
                'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });
        req.on('error', (e) => resolve({ error: e.message }));
        req.end();
    });
}

async function run() {
    // Current date in system (local time: 2026-06-30)
    console.log("=== Testing date: 2026-06-30 (Today) ===");
    const res1 = await testFlight('JL91', '2026-06-30');
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Body: ${res1.body.substring(0, 200)}...`);

    console.log("\n=== Testing date: 2026-05-15 (Past 1.5 Months) ===");
    const res2 = await testFlight('JL91', '2026-05-15');
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Body: ${res2.body.substring(0, 200)}...`);
}

run();
