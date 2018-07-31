angular.module('mwFormBuilder', ['ngSanitize','ng-sortable', 'pascalprecht.translate']);
angular.module('mwFormBuilder').filter('trustAsHtml', function($sce) {
  return function(html) {
    return $sce.trustAsHtml(html);
  };
});
