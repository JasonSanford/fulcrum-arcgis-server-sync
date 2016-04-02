function recordToGeoJSON(form, record) {
  var geojson = {
    type: 'Feature',
    properties: {}
  };

  if (record.latitude && record.longitude) {
    geojson.geometry = {
      type: 'Point',
      coordinates: [record.longitude, record.latitude]
    };
  } else {
    geojson.geometry = null;
  }

  form.elements.forEach(function (element) {
    if (element.key in record.form_values) {
      // TODO: This is currently hacked to match the schema
      if (element.type === 'YesNoField' || (element.type === 'TextField' && element.numeric)) {
        value = parseInt(record.form_values[element.key], 10);
      } else {
        value = record.form_values[element.key];
      }
      geojson.properties[element.data_name] = value;
    }
  });

  return geojson;
}

module.exports = recordToGeoJSON;
