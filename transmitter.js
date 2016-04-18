var axios = require("axios");


function Transmitter(options){
  this.syncTimeout = 20000;
  this.syncLoop = null;
  this.host = options.remoteOrigin;
  this.deviceId = options.deviceId;
  this.scopeId = options.scopeId;
  this.DB = options.DB;
  this.lastTransmission = null;
};

Transmitter.prototype.getScope = function(){
  var self = this;
  return
};

Transmitter.prototype.postData = function(data){
  return axios.post(this.host + 'api/production/paverTransmit', data);
};

Transmitter.prototype.sync = function(data){
  console.log('Paver transmitter service launched');
  var self = this;
  if(data && ((new Date - this.lastTransmission) < 5000 )){
    setTimeout(function(){self.sync(data)}, 5000);
    return 0;
  }

  axios.get(self.host + 'api/production/paverIndex/?deviceId=' + self.deviceId, {}).then(function(response){
    self.DB.query('SELECT * from `paverTrace` WHERE CONVERT_TZ( `finishTime`, "UTC", "+00:00" ) > ?', [response.data.updatedAt.toLocaleString('en-US', { timeZone: 'Asia/Almaty' })], function(err, rows) {
      if(err || rows.length == 0){
        console.log('No Data Left:', err);
        self.lastTransmission = new Date();
        setTimeout(function(){self.sync()}, self.syncTimeout);
      }
      else{
        rows.map(function(row){
          row.scopeId = response.data.id;
          delete row.id;
        });
        axios.post(self.host + 'api/production/paverTransmit', {data:rows}).then(function(result){
          console.log('['+result.data.code+']', result.data.msg)
          self.lastTransmission = new Date();
          setTimeout(function(){self.sync()}, self.syncTimeout);
        })
        .catch(function(error){
          console.log('TRANSMISSION ERROR:', error);
          self.lastTransmission = new Date();
          setTimeout(function(){self.sync()}, self.syncTimeout);
        });
      }
    });
  })
  .catch(function(error){
    console.log('connection error:', error);
    self.lastTransmission = new Date();
    setTimeout(function(){self.sync()}, self.syncTimeout);
  });
};



module.exports = Transmitter;
