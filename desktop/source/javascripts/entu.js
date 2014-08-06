var PAGE_URL = 'https://dev.entu.ee'
var API_URL  = PAGE_URL + '/api2/'

angular.module('entuApp', ['ngRoute', 'ngResource'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider
            .when('/', {
                controller: 'menuCtrl'
            })
            .when('/:definition', {
                controller: 'listCtrl'
            })
            .when('/:definition/:entity', {
                controller: 'entityCtrl'
            })
            .otherwise({
                redirectTo: '/'
            })
    }])

    .controller('mainCtrl', ['$scope', '$http', '$routeParams', function($scope, $http, $routeParams){
        $scope.pin_menu = true
        $scope.pin_menu_label = 'unpin'
        $scope.hide_menu = false

        $scope.page_url = PAGE_URL
        $scope.page_title = 'Entu'

        $scope.pinMenu = function() {
            $scope.pin_menu = !$scope.pin_menu
            $scope.pin_menu_label = ($scope.pin_menu) ? 'unpin' : 'pin'
        }

        $scope.showMenu = function() {
            if(!$scope.pin_menu) $scope.hide_menu = false
        }

        $scope.hideMenu = function() {
            if(!$scope.pin_menu) $scope.hide_menu = true
        }

        $scope.menuStyle = function(div) {
            if($scope.hide_menu) {
                if(div == 'sidebar') return {'left': '-168px'}
                if(div == 'list')    return {'left': '32px'}
                if(div == 'content') return {'left': '392px'}
                if(div == 'navbar')  return {'left': '-168px'}
            }
        }

    }])

    .controller('menuCtrl', ['$scope', '$resource', function($scope, $resource) {
        $scope.definitions = $resource(API_URL + 'definition').get()
        for(x in $scope.definitions.result) {
            $scope.definitions.result[x].visible = false
        }

        $scope.toggleMenuGroup = function(idx) {
            $scope.definitions.result[idx].visible = !$scope.definitions.result[idx].visible
        }

    }])

    .controller('listCtrl', ['$scope', '$http', '$routeParams', function($scope, $http, $routeParams){
        $http({method: 'GET', url: API_URL + 'entity', params: {definition: $routeParams.definition, limit:200}}).success(function(data) {
            $scope.entities = data
        })
    }])

    .controller('entityCtrl', ['$scope', '$http', '$resource', '$routeParams', function($scope, $http, $resource, $routeParams){
        $scope.loadEntity = function() {
            $http({method: 'GET', url: API_URL + 'entity-'+$routeParams.entity}).success(function(data) {
                $scope.entity = data
                $scope.$broadcast('scroll.refreshComplete')
            })
            $scope.childs = $resource(API_URL + 'entity-'+$routeParams.entity+'/childs').get()
            $scope.referrers = $resource(API_URL + 'entity-'+$routeParams.entity+'/referrals').get()
        }
        $scope.loadEntity()
    }])
