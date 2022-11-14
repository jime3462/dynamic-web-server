// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

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
    let home = '/region/central_east_atlantic'; 
    res.redirect(home);
});

// GET request handler for sea level data from a specific region
app.get('/sea_level_by_region/:region', (req, res) => {
        fs.readFile(path.join(template_dir, 'home.html'), 'utf8', (err, template) => {
            let query = 'SELECT * FROM SeaLevel2';
            let rawRegion = req.params.region;
            let readableFormatRegion = convertToReadableFormat(req.params.region);
            db.all(query, [], (err, rows) => {
                let regions = rows.map(row => convertFromReadableFormat(row.region));
                if(regions.indexOf(rawRegion) === -1) {
                    noDataHandler(res, 'region', readableFormatRegion);
                    return;
                }

                let labels = [];
                let data = [];
                let obj = rows.filter(row => row.region === readableFormatRegion)[0];
                for(let key in obj) {
                    if(key === 'region') continue;
                    labels.push('\'' + key + '\'');
                    data.push(obj[key]);
                }
                labels = '[' + labels.toString() + ']';
                data = '[' + data.toString() + ']';

                let labelName = 'Sea Level by region';
                template = template.replace('%%SCRIPT%%', generateChart('line', labelName, labels, data));
                template = template.replace('%%LINKS%%', generatePrevAndNextLinks('sea_level_by_region', regions, rawRegion));
                template = template.replace('%%LABEL_NAME%%', labelName);
                template = template.replace('%%SORT%%', readableFormatRegion);
                res.status(200).type('html').send(template);
            });

        });
});

// GET request handler for sea level data from a specific year
app.get('/sea_level_by_year/:year', (req, res) => {
    fs.readFile(path.join(template_dir, 'home.html'), 'utf8', (err, template) => {
        let query = 'SELECT * FROM SeaLevel1';
        let year = req.params.year;
        db.all(query, [], (err, rows) => {
            let years = Array.from(new Set(rows.map((row) => row.year + '')));
            rows = rows.filter((row) => row.year == year);
            let labelName = 'Sea Level by year';
            if(years.indexOf(year) === -1) {
                noDataHandler(res, labelName, year);
                return;
            }
            let regions = [];
            let total = {};
            for (let key in rows[0]) {
                if(key === 'month' || key === 'year') continue;
                total[key] = 0;
                regions.push(key);
            }
            rows.map((row) => {
                for (let region in total) {
                    total[region] += row[region];
                }
            })
            let labels = [];
            let data = [];
            for(let region in total) {
                labels.push(('\'' + region + '\''));
                data.push(total[region]/12);
            }
            labels = '[' + labels.toString() + ']';
            data = '[' + data.toString() + ']';

            template = template.replace('%%SCRIPT%%', generateChart('bar', labelName, labels, data));
            template = template.replace('%%LINKS%%', generatePrevAndNextLinks('sea_level_by_year', years, year));
            template = template.replace('%%LABEL_NAME%%', labelName);
            template = template.replace('%%SORT%%', 'Year: ' + year);
            
            res.status(200).type('html').send(template);
        });

    });
});

// GET request handler for sea level data from a specific month
app.get('/sea_level_by_month/:month', (req, res) => {
    fs.readFile(path.join(template_dir, 'home.html'), 'utf8', (err, template) => {
        let query = 'SELECT * FROM SeaLevel1';
        let month = req.params.month;
        db.all(query, [], (err, rows) => {
            let months = Array.from(new Set(rows.map((row) => row.month + '')));
            rows = rows.filter((row) => row.month == month);
            let labelName = 'Sea Level by month';
            if(months.indexOf(month) === -1) {
                noDataHandler(res, labelName, month);
                return;
            }
            let regions = [];
            let total = {};
            for (let key in rows[0]) {
                if(key === 'month' || key === 'year') continue;
                total[key] = 0;
                regions.push(key);
            }
            rows.map((row) => {
                for (let region in total) {
                    total[region] += row[region];
                }
            })
            let labels = [];
            let data = [];
            for(let region in total) {
                labels.push(('\'' + region + '\''));
                if(month > 5) {
                    data.push(total[region]/60);
                } else {
                    data.push(total[region]/61);
                }
            }
            labels = '[' + labels.toString() + ']';
            data = '[' + data.toString() + ']';

            template = template.replace('%%SCRIPT%%', generateChart('bar', labelName, labels, data));
            template = template.replace('%%LINKS%%', generatePrevAndNextLinks('sea_level_by_month', months, month));
            template = template.replace('%%LABEL_NAME%%', labelName);
            template = template.replace('%%SORT%%', 'Month: ' + month);
            
            res.status(200).type('html').send(template);
        });

    });
});

// GET request handler for Consecutive Dry Days (CDD) data from a specific year
app.get('/cdd_by_year/:year', (req, res) => {
    fs.readFile(path.join(template_dir, 'home.html'), 'utf8', (err, template) => {
        let query = 'SELECT * FROM CDD';
        let year = req.params.year;
        db.all(query, [], (err, rows) => {
            let years = Array.from(new Set(rows.map((row) => row.year + '')));
            rows = rows.filter((row) => row.year == year);
            let labelName = 'Consecutive Dry Days by year';
            if(years.indexOf(year) === -1) {
                noDataHandler(res, labelName, year);
                return;
            }
            let regions = [];
            let total = {};
            for (let key in rows[0]) {
                if(key === 'month' || key === 'year') continue;
                total[key] = 0;
                regions.push(key);
            }
            rows.map((row) => {
                for (let region in total) {
                    total[region] += row[region];
                }
            })
            let labels = [];
            let data = [];
            for(let region in total) {
                labels.push(('\'' + region + '\''));
                data.push(total[region]/12);
            }
            labels = '[' + labels.toString() + ']';
            data = '[' + data.toString() + ']';
            
            template = template.replace('%%SCRIPT%%', generateChart('bar', labelName, labels, data));
            template = template.replace('%%LINKS%%', generatePrevAndNextLinks('cdd_by_year', years, year));
            template = template.replace('%%LABEL_NAME%%', labelName);
            template = template.replace('%%SORT%%', 'Year: ' + year);

            res.status(200).type('html').send(template);
        });

    });
});

//Generate chart
const generateChart = (chartType, labelName, labels, data) => {
    let script = '<script>\n'+
    '        const labels = %%LABELS%%;\n'+
    '      \n'+
    '        const data = {\n'+
    '          labels: labels,\n'+
    '          datasets: [{\n'+
    '            label: \'' + labelName + '\',\n'+
    '            backgroundColor: \'rgb(255, 99, 132)\',\n'+
    '            borderColor: \'rgb(255, 99, 132)\',\n'+
    '            data: %%DATA%%,\n'+
    '          },\n' +  
    '         ]\n'+
    '        };\n'+
    '      \n'+
    '        const config = {\n'+
    '          type: \'' + chartType +'\',\n'+
    '          data: data,\n'+
    '          options: {}\n'+
    '        };\n'+
    '        const ctx = document.getElementById(\'myChart\').getContext(\'2d\');\n'+
    '        const myChart = new Chart(\n'+
    '            ctx,\n'+
    '            config\n'+
    '        );\n'+
    '    </script>\n';
    script = script.replace('%%LABELS%%', labels);
    script = script.replace('%%DATA%%', data);
    return script;
}


//Generate previous and next links
const generatePrevAndNextLinks = (dataType, dataArray, currentData) => {
    let curIdx = dataArray.indexOf(currentData);
    let prevHref = '';
    let prevStyle = '';
    let nextHref = '';
    let nextStyle = '';
    if(curIdx <= 0) {
        prevStyle = 'pointer-events: none; text-decoration: line-through; color: black; display: none;';
    } else if(curIdx >= dataArray.length - 1) {
        nextStyle = 'pointer-events: none; text-decoration: line-through; color: black; display: none;';
    } 
    if (curIdx >= 0 && curIdx < dataArray.length) {
        prevHref = `http://localhost:8000/${dataType}/${dataArray[curIdx - 1]}`;
        nextHref = `http://localhost:8000/${dataType}/${dataArray[curIdx + 1]}`;
    }
    return `<a href="${prevHref}" style="${prevStyle}">Previous</a> - <a href="${nextHref}" style="${nextStyle}">Next</a>`
}

//Example: Converting Southwest Pacific to southwest_pacific
const convertFromReadableFormat = (str) => str.toLowerCase().replaceAll(' ', '_');

//Example: Converting Southwest Pacific to southwest_pacific
const convertToReadableFormat = (str) => capitalizeFirstLetters(str.replaceAll('_', ' '));

//Example: Converting south west pacific to South West Pacific
const capitalizeFirstLetters = (str) => str.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

//Not found resources handler
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
