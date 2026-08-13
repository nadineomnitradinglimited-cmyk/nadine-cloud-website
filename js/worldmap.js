/* ---------- real world map (loaded from CDN, no build step) ----------
   Renders actual continent geography onto #worldMapSvg using d3-geo +
   topojson-client (small libraries, loaded at runtime) plus public land
   topology from the "world-atlas" package. If the CDN is blocked or
   offline, the static graticule already in the markup (#mapFallback)
   stays visible instead — nothing breaks. */
(function () {
  var svg = document.getElementById('worldMapSvg');
  if (!svg) return;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  var NS = 'http://www.w3.org/2000/svg';

  loadScript('https://unpkg.com/d3-array@3/dist/d3-array.min.js')
    .then(function () {
      return Promise.all([
        loadScript('https://unpkg.com/d3-geo@3/dist/d3-geo.min.js'),
        loadScript('https://unpkg.com/topojson-client@3/dist/topojson-client.min.js')
      ]);
    })
    .then(function () {
      return fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(function (r) { return r.json(); });
    })
    .then(function (world) {
      var land = topojson.merge(world, world.objects.countries.geometries);
      var projection = d3.geoEquirectangular().fitSize([940, 440], land);
      var geoPath = d3.geoPath(projection);

      var landPath = document.createElementNS(NS, 'path');
      landPath.setAttribute('d', geoPath(land));
      landPath.setAttribute('class', 'land');
      var title = document.createElementNS(NS, 'title');
      title.textContent = 'Nadine Cloud — remote-first, serving clients wherever they are';
      landPath.appendChild(title);

      var fallback = document.getElementById('mapFallback');
      if (fallback) fallback.remove();
      svg.insertBefore(landPath, svg.firstChild);

      var points = [
        { lng: 28.3, lat: -15.4, color: '#E08A3C' },
        { lng: -74.0, lat: 40.7, color: '#4C8DFF' },
        { lng: 10.0, lat: 51.0, color: '#9B7BEA' },
        { lng: 103.8, lat: 1.3, color: '#3ECF8E' },
        { lng: 151.2, lat: -33.9, color: '#E08A3C' }
      ];
      var coords = points.map(function (p) { return projection([p.lng, p.lat]); });

      var linePairs = [[0, 2], [2, 3], [1, 0]];
      linePairs.forEach(function (pair, i) {
        var a = coords[pair[0]], b = coords[pair[1]];
        if (!a || !b) return;
        var midX = (a[0] + b[0]) / 2, midY = Math.min(a[1], b[1]) - 40;
        var line = document.createElementNS(NS, 'path');
        line.setAttribute('d', 'M' + a[0] + ',' + a[1] + ' Q' + midX + ',' + midY + ' ' + b[0] + ',' + b[1]);
        line.setAttribute('class', 'flow-line');
        line.setAttribute('stroke', points[pair[0]].color);
        line.setAttribute('stroke-width', '1.6');
        line.setAttribute('stroke-dasharray', '5 7');
        line.setAttribute('fill', 'none');
        line.setAttribute('opacity', '.6');
        line.style.animationDelay = (-i * 1.1) + 's';
        svg.appendChild(line);
      });

      var group = document.getElementById('mapMarkers');
      points.forEach(function (p, i) {
        var xy = coords[i];
        if (!xy) return;
        var c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', xy[0]);
        c.setAttribute('cy', xy[1]);
        c.setAttribute('r', 5);
        c.setAttribute('fill', p.color);
        c.setAttribute('class', 'pulse-dot map-node');
        c.style.animationDelay = (i * 0.3) + 's';
        group.appendChild(c);
      });
    })
    .catch(function () {
      /* CDN blocked or offline — static fallback graticule in the markup stands as-is */
    });
})();
