var axios = require("axios");


function Transmitter(options){
  this.syncTimeout = 30000;
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
  if(data && ((new Date - this.lastTransmission) < 7000 )){
    setTimeout(function(){self.sync(data)}, 7000);
    return 0;
  }

  axios.get(this.host + 'api/production/paverIndex/?deviceId=' + this.deviceId, {}).then(function(response){
    self.DB.query('SELECT * from `paverTrace` WHERE `finishTime` > ?', [response.data.updatedAt], function(err, rows) {
      console.log('rows:', rows);
      if(err || rows.length == 0){
        console.log('No Data Left:', err);
        this.lastTransmission = new Date();
        self.syncLoop = setTimeout(self.sync, self.syncTimeout);
        return 0;
      }
      rows.map(function(row){
        row.scopeId = response.data.id;
      });
      self.postData({data:rows}).then(function(result){
        console.log('['+result.data.code+']', result.data.msg)
        this.lastTransmission = new Date();
        self.syncLoop = setTimeout(self.sync, self.syncTimeout);
      })
      .catch(function(error){
        console.log('TRANSMISSION ERROR:', error.status);
        this.lastTransmission = new Date();
        self.syncLoop = setTimeout(self.sync, self.syncTimeout);
      });
    });
  })
  .catch(function(error){
    console.log('connection error:', error);
    this.lastTransmission = new Date();
  });
};



module.exports = Transmitter;
