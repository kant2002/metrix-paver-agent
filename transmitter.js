var axios  = require("axios");
var moment = require('moment');


function Transmitter(options){
  this.syncTimeout = 20000;
  this.syncLoop = null;
  this.host = options.remoteOrigin;
  this.deviceId = options.deviceId;
  this.scopeId = options.scopeId;
  this.DB = options.DB;
  this.lastTransmission = new Date();
};

Transmitter.prototype.getScope = function(){
  var self = this;
  return
};

Transmitter.prototype.postData = function(data){
  return axios.post(this.host + 'api/production/paverTransmit', data);
};

Transmitter.prototype.extract = function(scopeId, period){
  var self = this;
  var setPoints = [];
  var tiePoints = [];
  var scopeId = scopeId;
  var start  = moment(period).utc().format();
  var finish = moment(period).add(30, 'minute').utc().format();

  self.DB.query('SELECT * from `setPoint` WHERE `finishTime` >= ? AND `finishTime` < ?', [start, finish], function(err, setPointRecords) {
    if(err){ setTimeout(function(){self.sync()}, self.syncTimeout);}
    else{
      setPoints = setPointRecords.map(function(point){
        point.scopeId = scopeId;
        delete point.id;
      });

      self.DB.query('SELECT * from `tiePoint` WHERE `dipTime` >= ? AND `dipTime` < ?', [start, finish], function(err, tiePointRecords) {
        if(err){setTimeout(function(){self.sync()}, self.syncTimeout);}
        else{
          tiePoints = tiePointRecords.map(function(point){
            point.scopeId = scopeId;
            delete point.id;
          });

          if(setPoints.length || tiePoints.length){
            var spTime = (setPoints[setPoints.length-1]) ? setPoints[setPoints.length-1].finishTime : null;
            var tpTime = (tiePoints[tiePoints.length-1]) ? tiePoints[tiePoints.length-1].dipTime : null;
            var updatedAt;
            if(spTime>tpTime) {updatedAt = spTime;}
            else {updatedAt = tpTime ? tpTime : spTime;}

            axios.post(self.host + 'api/production/paverTransmit', {data:{setPoints: setPoints, tiePoints: tiePoints, updatedAt: updatedAt, scopeId: scopeId}}).then(function(result){
              console.log('['+result.data.code+']', result.data.msg)
              self.lastTransmission = new Date();
              setTimeout(function(){self.sync()}, self.syncTimeout);
            })
            .catch(function(error){
              console.log('[ERROR] Data trasnmission error:', error);
              self.lastTransmission = new Date();
              setTimeout(function(){self.sync()}, self.syncTimeout);
            });
          }
          else if(finish < moment().format()){
            self.extract(scopeId, finish);
          }
          else {
            //already up to date
            setTimeout(function(){self.sync()}, self.syncTimeout);
          }
        }
      });
    }


  });
};

Transmitter.prototype.sync = function(data){
  var self = this;
  // if(data && ((new Date - this.lastTransmission) < 7000 )){
  //   setTimeout(function(){self.sync(data)}, 7000);
  //   return 0;
  // }

  axios.get(self.host + 'api/production/paverIndex/?deviceId=' + self.deviceId, {}).then(function(response){
    self.extract(response.data.id, response.data.updatedAt);
    // console.log('response::', response);

    // self.DB.query('SELECT * from `setPoint` WHERE CONVERT_TZ( `finishTime`, "+06:00", "+00:00" ) > ? LIMIT 10', [response.data.updatedAt], function(err, setPoints) {
    //   if(err || setPoints.length == 0){
    //     console.log('[SYNC ] No set point data left:', err);
    //     self.lastTransmission = new Date();
    //     setTimeout(function(){self.sync()}, self.syncTimeout);
    //   }
    //   else{
    //     setPoints.map(function(point){
    //       point.scopeId = response.data.id;
    //       delete point.id;
    //     });
    //
    //     self.DB.query('SELECT * from `tiePoint` WHERE CONVERT_TZ( `dipTime`, "+06:00", "+00:00" ) > ? LIMIT 50', [response.data.updatedAt], function(err, tiePoints) {
    //       if(err || tiePoints.length == 0){
    //         console.log('[SYNC ] No tie bar data left:', err);
    //         // self.lastTransmission = new Date();
    //         // setTimeout(function(){self.sync()}, self.syncTimeout);
    //       }
    //       else{
    //         tiePoints.map(function(point){
    //           point.scopeId = response.data.id;
    //           delete point.id;
    //         });
    //         console.log('sp:', setPoints.length);
    //         console.log('tp:', tiePoints.length);
    //
    //       }
    //
    //       axios.post(self.host + 'api/production/paverTransmit', {data:[setPoints, tiePoints]}).then(function(result){
    //         console.log('['+result.data.code+']', result.data.msg)
    //         self.lastTransmission = new Date();
    //         setTimeout(function(){self.sync()}, self.syncTimeout);
    //       })
    //       .catch(function(error){
    //         console.log('[ERROR] Data trasnmission error:', error);
    //         self.lastTransmission = new Date();
    //         setTimeout(function(){self.sync()}, self.syncTimeout);
    //       });
    //     });
    //   }
    // });
  })
  .catch(function(error){
    console.log('[ERROR] Unable to connect '+self.host, error.status);
    self.lastTransmission = new Date();
    setTimeout(function(){self.sync()}, self.syncTimeout);
  });
};



module.exports = Transmitter;
