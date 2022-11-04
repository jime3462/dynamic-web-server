// Built-in Node.js modules
let fs = require('fs');
let path = require('path');
const Chart = require('chart.js');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, '/db/data.sqlite3');

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
    let home = '/temperature_by_year/1991'; // <-- change this
    res.redirect(home);
});

// GET request handler for cereal from a specific month
app.get('/temperature_by_year/:year', (req, res) => {
        fs.readFile(path.join(template_dir, 'home.html'), 'utf8', (err, template) => {
            // modify `template` and send response
            // this will require a query to the SQL database
            let query = 'SELECT * FROM Sheet1 where year = ?';
            let year = req.params.year;
            //TODO: verify 0 or 1
            db.all(query, [year], (err, rows) => {
                let script = '<script>'+
                '        const labels = %%LABELS%%;'+
                '      '+
                '        const data = {'+
                '          labels: labels,'+
                '          datasets: [' +
                    '{'+
                    '            label: \'Max Temperature\','+
                    '            backgroundColor: \'rgb(255, 99, 132)\','+
                    '            borderColor: \'rgb(255, 99, 132)\','+
                    '            data: %%MAX%%,'+
                    '          },' +  
                    '{'+
                    '            label: \'Average Temperature\','+
                    '            backgroundColor: \'rgb(255, 0, 255)\','+
                    '            borderColor: \'rgb(255, 0, 255)\','+
                    '            data: %%AVG%%,'+
                    '          },' +   
                    '{'+
                    '            label: \'Min Temperature\','+
                    '            backgroundColor: \'rgb(135, 206, 235)\','+
                    '            borderColor: \'rgb(135, 206, 250)\','+
                    '            data: %%MIN%%,'+
                    '          },' + 
                          ']'+
                '        };'+
                '      '+
                '        const config = {'+
                '          type: \'line\','+
                '          data: data,'+
                '          options: {}'+
                '        };'+
                '        const ctx = document.getElementById(\'myChart\').getContext(\'2d\');'+
                '        const myChart = new Chart('+
                '            ctx,'+
                '            config'+
                '        );'+
                '    </script>';
                let labels = '[' + rows.map((row) => {
                    return '\'' + row.month + '/' + row.day + '\'';
                }) + ']';
                let avg = '[' + rows.map((row) => {
                    return row['average temperature'];
                }) + ']';
                let max = '[' + rows.map((row) => {
                    return row['maximum temperature'];
                }) + ']';
                let min = '[' + rows.map((row) => {
                    return row['minimum temperature'];
                }) + ']';
                script = script.replace('%%LABELS%%', labels);
                script = script.replace('%%AVG%%', avg);
                script = script.replace('%%MAX%%', max);
                script = script.replace('%%MIN%%', min);
                template = template.replace('%%SCRIPT%%', script);
                if(rows.length === 0) {
                    noDataHandler(res, 'year', year);
                } else {
                    res.status(200).type('html').send(template);
                }
            });
     
        });
});

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
