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

Transmitter.prototype.sync = function(data){
  console.log('Paver transmitter service launched');
  var self = this;
  if(data && ((new Date - this.lastTransmission) < 7000 )){
    setTimeout(function(){self.sync(data)}, 7000);
    return 0;
  }

  this.getScope.then(function(scope){
    self.DB.query('SELECT * from `paverTrace` WHERE `finishTime` > ?', [scope.updatedAt] function(err, rows) {
      if(err || rows.length == 0){
        console.log('err:', err);
        this.lastTransmission = new Date();
        self.syncLoop = setTimeout(self.sync, self.syncTimeout);
      }
      rows.map(function(row){
        row.scopeId = scope.id;
      });
      self.postData(rows).then(function(){
        this.lastTransmission = new Date();
        self.syncLoop = setTimeout(self.sync, self.syncTimeout);
      });
    });
  })
  .catch(function(error){
    console.log('error:', error);
    this.lastTransmission = new Date();
  });
};

Transmitter.prototype.getScope = function(){
  var self = this;
  return axios.get(this.host + 'api/production/paverIndex/?deviceId=' + this.deviceId, {});
};

Transmitter.prototype.postData = function(data){
  return axios.post(this.host + 'api/production/paverTransmit', data);
};

module.exports = Transmitter;
