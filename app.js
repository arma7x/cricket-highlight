const APP_VERSION = "1.0.0";

const xhr = function(method, url, data={}, query={}, headers={}) {
  //url = `https://kaios.tri1.workers.dev/?url=${encodeURIComponent(url)}`;
  return new Promise((resolve, reject) => {
    var xhttp = new XMLHttpRequest();
    var _url = new URL(url);
    for (var y in query) {
      _url.searchParams.set(y, query[y]);
    }
    url = _url.origin + _url.pathname + '?' + _url.searchParams.toString();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status >= 200 && this.status <= 299) {
          try {
            const response = JSON.parse(xhttp.response);
            resolve({ raw: xhttp, response: response});
          } catch (e) {
            resolve({ raw: xhttp, response: xhttp.responseText});
          }
        } else {
          try {
            const response = JSON.parse(xhttp.response);
            reject({ raw: xhttp, response: response});
          } catch (e) {
            reject({ raw: xhttp, response: xhttp.responseText});
          }
        }
      }
    };
    xhttp.open(method, url, true);
    for (var x in headers) {
      xhttp.setRequestHeader(x, headers[x]);
    }
    if (Object.keys(data).length > 0) {
      xhttp.send(JSON.stringify(data));
    } else {
      xhttp.send();
    }
  });
}

const getMatches = (p) => {
  return new Promise((resolve, reject) => {
    xhr('GET', 'https://malaysiaapi-arma7x.koyeb.app/cricket/v1/list', {}, {'p': p})
    .then(data => {
      resolve(data.response);
    })
    .catch(err => {
      reject(err);
    });
  });
}

window.addEventListener("load", function() {

  const dummy = new Kai({
    name: '_dummy_',
    data: {
      title: '_dummy_'
    },
    verticalNavClass: '.dummyNav',
    templateUrl: document.location.origin + '/templates/dummy.html',
    mounted: function() {},
    unmounted: function() {},
    methods: {},
    softKeyText: { left: 'L2', center: 'C2', right: 'R2' },
    softKeyListener: {
      left: function() {},
      center: function() {},
      right: function() {}
    },
    dPadNavListener: {
      arrowUp: function() {
        this.navigateListNav(-1);
      },
      arrowDown: function() {
        this.navigateListNav(1);
      }
    }
  });

  const state = new KaiState({});

  const changelogs = new Kai({
    name: 'changelogs',
    data: {
      title: 'changelogs'
    },
    templateUrl: document.location.origin + '/templates/changelogs.html',
    mounted: function() {
      this.$router.setHeaderTitle('Changelogs');
    },
    unmounted: function() {},
    methods: {},
    softKeyText: { left: '', center: '', right: '' },
    softKeyListener: {
      left: function() {},
      center: function() {},
      right: function() {}
    }
  });

  const Home = new Kai({
    name: 'home',
    data: {
      title: 'home',
      matches: [],
      next: true,
    },
    verticalNavClass: '.homeNav',
    components: [],
    templateUrl: document.location.origin + '/templates/home.html',
    mounted: function() {
      this.$router.setHeaderTitle('Cricket Highlight');
      const CURRENT_VERSION = window.localStorage.getItem('APP_VERSION');
      if (APP_VERSION != CURRENT_VERSION) {
        this.$router.showToast(`Updated to version ${APP_VERSION}`);
        this.$router.push('changelogs');
        window.localStorage.setItem('APP_VERSION', APP_VERSION);
        return;
      }
      if (this.data.matches.length === 0) {
        this.methods.load(1);
      }
    },
    unmounted: function() {

    },
    methods: {
      load: function(page) {
        this.$router.showLoading();
        getMatches(page)
        .then(match => {
          this.data.matches.pop();
          match.content.forEach(m => {
            m['video'] = true
          });
          var merged = [...this.data.matches, ...match.content];
          if (match.next === true)
            merged.push({ 'video': false, next: page + 1});
          this.setData({ matches: merged, next: match.next });
        })
        .catch(err => {
          this.$router.showToast('Error');
          //console.log(err);
        })
        .finally(() => {
          this.$router.hideLoading();
        });
      },
      getLeague: function(league) {
        matchesPage(this.$router, league.name, league.matches);
      },
    },
    softKeyText: { left: 'Menu', center: 'SELECT', right: 'Thumbnail' },
    softKeyListener: {
      left: function() {
        var menu = [
          {'text': 'Refresh'},
          {'text': 'Changelogs'},
          {'text': 'Exit'},
        ]
        this.$router.showOptionMenu('Menu', menu, 'SELECT', (selected) => {
          if (selected.text === 'Changelogs') {
            this.$router.push('changelogs');
          } else if (selected.text === 'Refresh') {
            this.verticalNavIndex = -1;
            this.data.matches = [];
            this.methods.load(1);
          } else if (selected.text === 'Exit') {
            window.close();
          }
        }, () => {});
      },
      center: function() {
        displayKaiAds();
        if (this.verticalNavIndex > -1 && this.data.matches.length > 0) {
          if (this.data.matches[this.verticalNavIndex].video) {
            this.$router.showLoading();
            xhr('GET', 'https://malaysiaapi-arma7x.koyeb.app/cricket/v1/get', {}, {'id': this.data.matches[this.verticalNavIndex].path})
            .then(data => {
              if (data.response.id) {
                setTimeout(() => {
                  this.$router.showOptionMenu('Player', [{text: 'Normal'}, {text: 'Embed'}], 'SELECT', (selected) => {
                    if (selected.text === 'Normal')
                      window.open(`https://www.youtube.com/watch?v=${data.response.id}`);
                    else
                      window.open(`https://www.youtube.com/embed/${data.response.id}`);
                  }, () => {});
                }, 100);
              } else {
                this.$router.showToast('Unavailable');
              }
            })
            .catch(err => {
              this.$router.showToast('Error');
              console.log(err);
            })
            .finally(() => {
              this.$router.hideLoading();
            });
          } else {
            this.methods.load(this.data.matches[this.verticalNavIndex].next);
          }
        }
      },
      right: function() {
        if (this.verticalNavIndex > -1 && this.data.matches.length > 0) {
          if (this.data.matches[this.verticalNavIndex].video) {
            this.$router.showDialog('Thumbnail', `<div style="width:230px;height:113px;overflow:hidden;"><img referrerpolicy="no-referrer" src="${this.data.matches[this.verticalNavIndex].img}" style="width:230px;"/></div>`, null, ' ', () => {}, 'Close', () => {}, ' ', () => {}, () => {});
          }
        }
      }
    },
    dPadNavListener: {
      arrowUp: function() {
        if (this.verticalNavIndex <= 0)
          return
        this.navigateListNav(-1);
      },
      arrowDown: function() {
        const listNav = document.querySelectorAll(this.verticalNavClass);
        if (this.verticalNavIndex === listNav.length - 1)
          return
        this.navigateListNav(1);
      },
    }
  });

  const router = new KaiRouter({
    title: 'Cricket Highlight',
    routes: {
      'index' : {
        name: 'Home',
        component: Home
      },
      'changelogs' : {
        name: 'changelogs',
        component: changelogs
      }
    }
  });

  const app = new Kai({
    name: '_APP_',
    data: {},
    templateUrl: document.location.origin + '/templates/template.html',
    mounted: function() {},
    unmounted: function() {},
    router,
    state
  });

  try {
    app.mount('app');
  } catch(e) {
    console.log(e);
  }

  function displayKaiAds() {
    var display = true;
    if (window['kaiadstimer'] == null) {
      window['kaiadstimer'] = new Date();
    } else {
      var now = new Date();
      if ((now - window['kaiadstimer']) < 300000) {
        display = false;
      } else {
        window['kaiadstimer'] = now;
      }
    }
    console.log('Display Ads:', display);
    if (!display)
      return;
    getKaiAd({
      publisher: 'ac3140f7-08d6-46d9-aa6f-d861720fba66',
      app: 'cricket-highlight',
      slot: 'kaios',
      onerror: err => console.error(err),
      onready: ad => {
        ad.call('display')
        ad.on('close', () => {
          app.$router.hideBottomSheet();
          document.body.style.position = '';
        });
        ad.on('display', () => {
          app.$router.hideBottomSheet();
          document.body.style.position = '';
        });
      }
    })
  }

  displayKaiAds();

  document.addEventListener('visibilitychange', function(ev) {
    if (document.visibilityState === 'visible') {
      displayKaiAds();
    }
  });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
  .then(function(swReg) {
    // console.error('Service Worker Registered');
  })
  .catch(function(error) {
    // console.error('Service Worker Error', error);
  });
}
