// Built-in Node.js modules
let fs = require('fs');
let path = require('path');
const Chart = require('chart.js');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, '/db/sea-level-data.sqlite3');

let app = express();
let port = 8000;

// Open SQLite3 database (in read-only mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Serve static files from 'public' directory
app.use(express.static(public_dir));


// GET request handler for home page '/' (redirect to desired route)
app.get('/', (req, res) => {
    let home = '/region/central_east_atlantic'; // <-- change this
    res.redirect(home);
});

// GET request handler for cereal from a specific month
app.get('/region/:region', (req, res) => {
        fs.readFile(path.join(template_dir, 'home.html'), 'utf8', (err, template) => {
            let query = 'SELECT * FROM Sheet3 where region = ?';
            let region = capitalizeFirstLetters(req.params.region.replaceAll('_', ' '));
            db.all(query, [region], (err, rows) => {
                let script = '<script>\n'+
                '        const labels = %%LABELS%%;\n'+
                '      \n'+
                '        const data = {\n'+
                '          labels: labels,\n'+
                '          datasets: [{\n'+
                '            label: \'Sea Level\',\n'+
                '            backgroundColor: \'rgb(255, 99, 132)\',\n'+
                '            borderColor: \'rgb(255, 99, 132)\',\n'+
                '            data: %%DATA%%,\n'+
                '          },\n' +  
                '         ]\n'+
                '        };\n'+
                '      \n'+
                '        const config = {\n'+
                '          type: \'line\',\n'+
                '          data: data,\n'+
                '          options: {}\n'+
                '        };\n'+
                '        const ctx = document.getElementById(\'myChart\').getContext(\'2d\');\n'+
                '        const myChart = new Chart(\n'+
                '            ctx,\n'+
                '            config\n'+
                '        );\n'+
                '    </script>\n';
                let labels = [];
                let data = [];
                let obj = rows[0];
                for(let key in obj) {
                    if(key === 'region') continue;
                    labels.push('\'' + key + '\'');
                    data.push(obj[key]);
                }
                labels = '[' + labels.toString() + ']';
                data = '[' + data.join(',') + ']';
                script = script.replace('%%LABELS%%', labels);
                script = script.replace('%%DATA%%', data);
                template = template.replace('%%SCRIPT%%', script);
                if(rows.length === 0) {
                    noDataHandler(res, 'region', region);
                } else {
                    res.status(200).type('html').send(template);
                }
            });
     
        });
});

const capitalizeFirstLetters = (str) => str.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

const noDataHandler = (res, type, value) => {
    let template = '<!DOCTYPE html>\n'+
                    '<html lang="en">\n'+
                        '<head>\n'+
                        '  <meta charset="utf-8">\n'+
                        '  <title>No Data</title>\n'+
                        '</head>\n'+
                        '<body>\n'+
                        '    Error: No data for %%TYPE%% %%VALUE%%\n'+
                        '</body>\n'+
                    '</html>';
    template = template.replace("%%TYPE%%", type);
    template = template.replace("%%VALUE%%", value);
    res.status(404).type('html').send(template);
}

// Start server
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
