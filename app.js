var express = require('express');
var fs = require('fs');
var sprintf = require('sprintf');

var tu = require('./topojson_utils.js');

// wget -q -O - 'http://localhost:8000/huc12/-83.902587890625,35.964669147704086'
// wget -q -O - 'http://watershed-location-service.fernleafinteractive.com/huc12/-83.902587890625,35.964669147704086'

var datapath = "/var/data/watershed-location-service/data.json";
//var datapath = "/home/mbp/watersheds/data/data.json";

var app = express();

function accessDenied(res) {
    res.status(403);
    res.send('Access Denied');
}

var geoms = [];
var topo = undefined;

fs.readFile(datapath, function(err, content) {
    if (err) throw err;
    var data = JSON.parse(content);
    topo = data.topo;
    topo.decodedArcs = topo.arcs.map(function(arc) { return tu.decodeArc(topo, arc); });
    var geomList = topo.objects['huc12'].geometries;
    geomList.forEach(function(geom) {
        geom.bbox = tu.geom_bbox(geom, topo);
    });
    geoms = geomList;
    //console.log('ready');
});

function id_of_geom_containing_point(p, geoms, topo) {
    var i;
    for (i=0; i<geoms.length; ++i) {
        if (tu.box_contains_point(geoms[i].bbox, p)) {
            if (tu.point_in_geom2d(p, geoms[i], topo)) {
                return geoms[i].id;
            }
        }
    }
    return null;
}

// CORS header for cross-origin requests:
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/", function(req, res) {
    accessDenied(res);
});
app.post("/", function(req, res) {
    accessDenied(res);
});

app.get("/huc12/:lonlat", function(req, res) {
    var fields = req.params.lonlat.split(/,/);
    var lon = parseFloat(fields[0]);
    var lat = parseFloat(fields[1]);
    //res.setHeader('Content-Type', 'text/plain');
    //res.send(sprintf("you said %f,%f, and fstatus=%s\n", lon, lat, fstatus));
    if (geoms.length > 0) {
        var id = id_of_geom_containing_point([lon,lat], geoms, topo);
        res.setHeader('Content-Type', 'text/plain');
        if (id === null) {
            res.send("\n");
        } else {
            res.send(id + "\n");
        }
    } else {
        res.setHeader('Content-Type', 'text/plain');
        res.send("\n");
    }
});

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

var port = normalizePort(process.env.PORT || '8000');

var server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Listening at http://%s:%s', host, port);
});
