// https://leafletjs.com/examples/quick-start/

import L from 'leaflet'

const apiKey = ""
const filter = ""

const map = L.map('map', {
  keyboard: false,
  dragging: false,
  zoomControl: false,
  boxZoom: false,
  doubleClickZoom: false,
  scrollWheelZoom: false,
  tap: false,
  touchZoom: false,
  center: [49.68695, -62.30469],
  zoom: 6
})
map.attributionControl.setPrefix('<a href="https://datastream.org" title="Open data platform">DataStream</a> | <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>')

// Base Layer - Communities
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org"> OpenStreetMap</a> contributors',
  detectRetina: false
}).addTo(map)

const markerOptions = {
  stroke: false,
  weight: 0,
  fillColor: '#175C89',
  fillOpacity: 1,
  highlight: false,
  interactive: true,
  radius: 5,
  keepInView: true
}

const urlSource = 'https://api.datastream.org'

const request = async (urlPath, urlQueryString, filter) => {
  try {
    return fetch(urlSource + urlPath + urlQueryString + `&$filter=${encodeURIComponent(filter)}`, {
      headers: {
        'x-api-key': apiKey
      }
    })
    .then(res => res.json())
    .then(res => {
      if (res.errors) throw new Error(res.errors)
      return res.value ?? []
    })
  } catch (e) {
    console.error(e)
  }
  return []
}

const getLocations = async (filter = '') => {
  return request(`/v1/odata/v4/Locations`,`?$top=9999&$select=NameId,Name,LatitudeNormalized,LongitudeNormalized,DOI`, filter)
}

const limit = 25
const getMetadata = async (datasetIds = [], results = []) => {
  if (!datasetIds.length) return results
  const filterDatasetIds = datasetIds.slice(0, limit)
  const leftoverDatasetIds = datasetIds.slice(limit)
  const filter = `DOI eq 'https://doi.org/${filterDatasetIds.join(`' or DOI eq '`)}'`
  
  return request(`/v1/odata/v4/Metadata`,`?$top=${limit}&$select=DatasetName,DOI`, filter)
    .then(datasets => {
      return getMetadata(leftoverDatasetIds, datasets.concat(results))
    })
}

const init = async (filter) => {
  
  let locations = await getLocations(filter)
  const datasetIds = [...new Set(locations.map(l => l.DOI))]
  let metadata = await getMetadata(datasetIds)
  
  const datasets = {}
  metadata.forEach(d => {
    datasets[d.DOI] = d
  })
  
  const markers = locations.map((l) => {
    const d = datasets[l.DOI] || {}
    const doi = (d.DOI || '').substr(0, 4) === 'http' ? d.DOI : `https://doi.org/${d.DOI}`
    const html =
    '<strong>' + l.Name + ' (' + l.NameId + ')</strong><br/>' +
    '<em>' + l.LatitudeNormalized + '&deg;, ' + l.LongitudeNormalized + '&deg;</em><br/>' +
    '<a href="' + doi + '" target="_blank">' + d.DatasetName + '</a>'
    
    return L.circleMarker([l.LatitudeNormalized, l.LongitudeNormalized], markerOptions)
    .addTo(map)
    .bindPopup(html)
  })
  
  // Automated re-sizing
  const group = new L.featureGroup(markers, {})
  const defaultBounds = group.getBounds()
  map.on('popupopen', function (elem) {
    map.flyTo(elem.popup.getLatLng(), 9)
  }, map)
  map.on('popupclose', function () {
    this.flyToBounds(defaultBounds)
  }, map)
  map.fitBounds(defaultBounds)
  
  map.on('resize', function () {
    map.fitBounds(defaultBounds)
  })
  map.fitBounds(defaultBounds)
  
  document.addEventListener('keyup', function (elem) {
    if (elem.code === 'Escape') {
      map.closePopup()
    }
  })
}

init(filter)
