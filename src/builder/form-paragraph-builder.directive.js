angular.module('mwFormBuilder').factory("FormParagraphBuilderId", function(){
    var id = 0;
        return {
            next: function(){
                return ++id;
            }
        }
    })

    .directive('mwFormParagraphBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageElementBuilder',
        scope: {
            paragraph: '=',
            formObject: '=',
            onReady: '&',
            isPreview: '=?',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-paragraph-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["$timeout", "FormParagraphBuilderId", function($timeout,FormParagraphBuilderId){
            var ctrl = this;
            ctrl.requiredPara = false;
            ctrl.number = 100; 
            ctrl.getNumber = function(num)
            {
                return new Array(num);
            }
            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                ctrl.id = FormParagraphBuilderId.next();
                ctrl.formSubmitted=false;
            };

            ctrl.save=function() {
                ctrl.paragraph.html = $('.summernote').summernote('code');
                ctrl.formSubmitted=true;
                if (!$('.summernote').summernote('isEmpty')) {
                    ctrl.requiredPara = false;
                    ctrl.onReady();
                } else {
                    ctrl.requiredPara = true;
                }
            };

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
