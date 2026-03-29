// Chart.js and chartjs-plugin-zoom loader for dashboards
(function(){
  console.log('Chart.js loader starting...');
  
  function loadScript(src, cb) {
    console.log('Loading script:', src);
    var script = document.createElement('script');
    script.src = src;
    script.onload = function() {
      console.log('Script loaded:', src);
      if (cb) cb();
    };
    script.onerror = function() {
      console.error('Failed to load script:', src);
    };
    document.head.appendChild(script);
  }
  
  if (!window.Chart) {
    console.log('Chart.js not found, loading...');
    // Load the UMD build so it works in non-module pages
    loadScript('https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js', function(){
      console.log('Chart.js loaded, version:', window.Chart?.version);
      loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js', function(){
        console.log('Zoom plugin loaded');
        if(window.onChartJsLoaded) {
          console.log('Calling onChartJsLoaded callback');
          window.onChartJsLoaded();
        }
      });
    });
  } else {
    console.log('Chart.js already loaded, version:', window.Chart?.version);
    if (!window.Chart || (window.Chart && !window.Chart.registry.getPlugin('zoom'))) {
      loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js', function(){
        console.log('Zoom plugin loaded');
        if(window.onChartJsLoaded) {
          console.log('Calling onChartJsLoaded callback');
          window.onChartJsLoaded();
        }
      });
    } else {
      console.log('Everything already loaded');
      if(window.onChartJsLoaded) {
        console.log('Calling onChartJsLoaded callback');
        window.onChartJsLoaded();
      }
    }
  }
})();
