angular.module('mwFormBuilder').factory("FormParagraphConditionBuilderId", function(){
    var id = 0;
        return {
            next: function(){
                return ++id;
            }
        }
    })

    .directive('mwFormParagraphConditionBuilder', function ($rootScope) {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageElementBuilder',
        scope: {
            paragraphcondition: '=',
            paragraphconditionfalse: '=',
            paragraphconditionunset: '=',
            paragraphconditionsubtext: '=',
            selecteditem: '=',
            formObject: '=',
            onReady: '&',
            isPreview: '=?',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-paragraphcondition-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["$timeout", "FormParagraphConditionBuilderId", function($timeout,FormParagraphConditionBuilderId){
            var ctrl = this;
            
            // debugger
            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                // debugger
                ctrl.id = FormParagraphConditionBuilderId.next();
                ctrl.formSubmitted=false;
            };

            ctrl.save=function(){
                // debugger;
                ctrl.formSubmitted=true;
                // if(ctrl.form.$valid){
                    ctrl.onReady();
                // }
            };

            ctrl.saveKey = function(SfData){
                console.log("SELECTED KEY",SfData);
                $rootScope.selectedSfKey = SfData.key;
            }

            ctrl.test=function()
            {
                // debugger
                ctrl.selecteditem
                console.log("--"+ctrl.paragraphcondition.html);
                console.log("--"+ctrl.paragraphconditionfalse.html);
                //debugger;
            }

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }

        }],
        link: function (scope, ele, attrs, formPageElementBuilder){
            var ctrl = scope.ctrl;
            ctrl.options = formPageElementBuilder.options;
        }
    };
});
