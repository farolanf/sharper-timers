"use strict";

function getTime() {
  let d = new Date();
  return d.getTime() / 1000.0;
}


var TimerManager = function() {
  var _timers = []
  
  function clear() {
    for (let timer of _timers) {
      timer.remove();
    }
    
    _timers = [];
  }
  
  return {
    add(timer) {
      _timers.push(timer);
      timer.addToHTML();
    },
    
    remove(timer) {
      let i = _timers.indexOf(timer);
      if (i > -1) {
        _timers.splice(i, 1);
      }
    },
    
    clear: clear,
    
    serializeTimers() {
      return _timers.map(t => t.serialize());
    },
    
    deserializeTimers(json) {
      clear();
      for (let timerJson of json) {
        Timer.deserialize(timerJson);
      }
    },
    
    updateTimers: function() {
      let t = getTime();
      for (let timer of _timers) {
        timer.update(t);
      }
    },
    
    get numTimers() {
      return _timers.length;
    }
  }
}();


var $timers = $("#timers");
const ADJUST_UNITS = {"H": 3600.0, "M": 60.0, "S": 1.0};
class Timer {
  constructor(title, time, rate, started) {
    this._title = title ? title : "Timer " + (TimerManager.numTimers + 1);
    this._start = started ? Math.floor(getTime()) : NaN;
    this._time = time ? time : 0.0;
    this._totalTime = this._time;
    this._rate = rate ? rate : 0.0;
    
    this._elements = {};
    
    TimerManager.add(this);
  }
  
  serialize() {
    return {
      title: this._title,
      time: this._totalTime,
      rate: this._rate,
      started: this.started
    }
  }
  
  static deserialize(json) {
    return new Timer(
      json.title,
      Number(json.time),
      Number(json.rate),
      json.started
    );
  }
  
  addToHTML() {
    let $timer = $("#timer-model").clone().show();
    $timers.append($timer);
    
    this._elements[""] = $timer;
    this._elements["time"] = $timer.find("#time");
    this._elements["total"] = $timer.find("#total");
    
    let that = this;
    
    let $adjustTime = $timer.find("#adjust-time");
    let $adjustUnit = $timer.find("#adjust-unit");
    let $titleShowing = $timer.find("#title-showing");
    let $titleEditing = $timer.find("#title-editing");
    let $titleInput = $timer.find("#title-input");
    let $title = $timer.find("#title");
    
    $title.text(this.title);
    
    $timer.find("#edit-title").click(function() {
      $titleShowing.hide();
      $titleEditing.show();
      $titleInput.val(that.title);
      $titleInput.select();
    });
    
    function doneEditing() {
      that.title = $titleInput.val();
      $title.text(that.title);
      $titleEditing.hide();
      $titleShowing.show();
    }
    
    $titleInput.change(doneEditing);
    $titleInput.on("keydown", function (e) {
      const KEY_ENTER = 13;
      (e.which == KEY_ENTER) && doneEditing();
    });
    $titleInput.on("blur", doneEditing);
    
    function adjustFunction(m) {
      return function() {
        let mult = m;
        let unit = $adjustUnit.text();
        if (ADJUST_UNITS[unit]) {
          mult *= ADJUST_UNITS[unit];
        }
        if ($adjustTime[0].validity.valid) {
          that.adjust(Number($adjustTime.val()) * mult);
        }
      }
    }
    
    $timer.find("#minus-time").click(adjustFunction(-1.0));
    
    $timer.find("#adjust-unit").click(function(e) {
      let elem = $(e.target);
      let units = Object.keys(ADJUST_UNITS);
      elem.text(units[(units.indexOf(elem.text()) + 1) % units.length]);
    });
    
    $timer.find("#plus-time").click(adjustFunction(+1.0));
    
    $timer.find("#rate").on("input", function(e) {
      if (e.target.validity.valid) {
        that.rate = e.target.value;
      }
    });
    
    $timer.find("#reset").click(function() {
      that.reset();
      that.render();
    })
    
    let $play = $timer.find("#play");
    let $pause = $timer.find("#pause");
    
    $play.click(function() {
      that.start();
      $play.hide();
      $pause.show();
    });
    
    $pause.click(function() {
      that.pause();
      $pause.hide();
      $play.show();
    });
    
    if (this.started) {
      $play.hide();
      $pause.show();
    }
    
    $timer.find("#remove-timer").click(function() {
      if (confirm("Are you sure you want to delete " + that.title + "?")) {
        TimerManager.remove(that);
        that.remove();
      }
    });
    
    this.update(getTime());
    this.render();
  }
  
  start() {
    this._start = Math.floor(getTime());
  }
  
  pause() {
    this._time += Math.floor(getTime()) - this._start;
    this._totalTime = this._time;
    this._start = NaN;
  }
  
  reset() {
    this._time = 0.0;
    this._totalTime = 0.0;
    if (this._start) {
      this._start = Math.floor(getTime());
    }
  }
  
  adjust(delta) {
    this._time += delta;
    this._totalTime += delta;
    this.render();
  }
  
  update(t) {
    this._totalTime = this._time;
    if (this._start) {
      this._totalTime += t - this._start;
      this.render();
    }
  }
  
  render() {
    let time = Math.abs(this._totalTime);
    let hourly = time / 3600.0;
    let negative = this._totalTime < 0;
    
    let hours = Math.floor(time / 3600);
    time -= hours * 3600;
    let minutes = Math.floor(time / 60.0);
    time -= minutes * 60;
    let seconds = Math.floor(time);
    
    let timeText = (  ("" + hours).padStart(2, '0') + ":" +
                    ("" + minutes).padStart(2, '0') + ":" +
                    ("" + seconds).padStart(2, '0'));
    let totalText = (hourly * this._rate).toFixed(2);
    if (negative) {
      timeText = "-" + timeText;
      totalText = "-" + totalText;
    }
    
    let $time = this._elements["time"];
    let $total = this._elements["total"];
    
    if ($time.text() !== timeText) {
      $time.text(timeText);
    }
    
    if ($total.text() !== totalText) {
      $total.text(totalText);
    }
  }
  
  remove() {
    this._elements[""].remove();
  }
  
  set rate(v) {
    this._rate = Number(v);
    this.render();
  }
  
  get started() {
    return !isNaN(this._start);
  }
  
  get title() {
    return this._title;
  }
  
  set title(title) {
    this._title = title;
  }
}


setInterval(TimerManager.updateTimers, 100);


$("#add-timer").click(function() {
  new Timer();
});

$("#clear-timers").click(function() {
  if (TimerManager.numTimers > 0) {
    if (confirm("Are you sure you want to clear the timers?")) {
      TimerManager.clear();
    }
  }
})


var $downloader = $("#downloader");
function download(url, name) {
  $downloader.attr({href: url, download: name})[0].click();
}

$("#save-timers").click(function() {
  let json = TimerManager.serializeTimers();
  let file = new Blob([JSON.stringify(json)], {type: "application/json"});
  download(URL.createObjectURL(file), "times.json");
});


var $loadFileInput = $("#load-file-input");
$("#load-timers").click(function() {
  $loadFileInput.click();
});

$loadFileInput.change(function(e) {
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  console.log(file);
  reader.onload = function(f) {
    try {
      var data = JSON.parse(f.target.result);
      TimerManager.deserializeTimers(data);
    } catch (ex) {
      alert("Invalid save file!");
      throw ex;
    }
  };
  reader.readAsText(file);
});

autoLoad(autoSave)

function autoSave () {
  $.ajax({
    url: '/timers',
    method: 'post',
    data: JSON.stringify(TimerManager.serializeTimers()),
    contentType: 'text/plain; charset=utf-8',
    complete: () => setTimeout(autoSave, 5000)
  })
}

function autoLoad (cb) {
	$.ajax({
    url: '/timers.json',
  }).then(data => {
    data && TimerManager.deserializeTimers(data)
    cb()
  }).catch(cb)
}
