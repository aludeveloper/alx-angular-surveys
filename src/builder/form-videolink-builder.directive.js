angular.module('mwFormBuilder').factory("FormVideoLinkBuilderId", function(){
    var id = 0;
        return {
            next: function(){
                return ++id;
            }
        };
    })

    .directive('mwFormVideolinkBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageElementBuilder',
        scope: {
            videolink: '=',
            formObject: '=',
            onReady: '&',
            isPreview: '=?',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-videolink-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["$timeout", "FormVideoLinkBuilderId", function($timeout,FormVideoLinkBuilderId){
            var ctrl = this;
            console.log(ctrl);
            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                ctrl.id = FormVideoLinkBuilderId.next();
                ctrl.formSubmitted=false;
            };

            ctrl.save=function(){
                ctrl.formSubmitted=true;
                // if(ctrl.form.$valid){
                    ctrl.onReady();
                // }
            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }

        }],
        link: function (scope, ele, attrs, formPageElementBuilder){
            var ctrl = scope.ctrl;
        }
    };
});
