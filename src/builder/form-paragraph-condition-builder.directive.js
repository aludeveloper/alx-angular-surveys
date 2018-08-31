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
                //ctrl.formSubmitted=true;
                // if(ctrl.form.$valid){
                    //ctrl.onReady();
                // }

                
                var textData = $('.summernote');
                // console.log(textData);
                // var temp1 = [textData[0]];
                // var temp2 = [textData[1]];
                // var temp3 = [textData[2]];
                // var temp4 = [textData[3]];

                // console.log($(temp1).summernote('code'));
                for(var i=0; i<textData.length; i++){
                    if(textData[i].id == "pc-true"){
                        ctrl.paragraphcondition.html = $(textData[i]).summernote('code');
                    }else if(textData[i].id == "pc-false"){
                        ctrl.paragraphconditionfalse.html = $(textData[i]).summernote('code');
                    }else if(textData[i].id == "pc-unset"){
                        ctrl.paragraphconditionunset.html = $(textData[i]).summernote('code');
                    }else if(textData[i].id == "pc-subtext"){
                        ctrl.paragraphconditionsubtext.html = $(textData[i]).summernote('code');
                    }
                }
                console.log("DATA",ctrl.paragraphcondition.html,ctrl.paragraphconditionfalse.html,
                    ctrl.paragraphconditionunset.html,ctrl.paragraphconditionsubtext.html);
                ctrl.formSubmitted=true;
                // if (!$('#paragraphConditionTrue').summernote('isEmpty')) {
                //     ctrl.requiredPara = false;
                ctrl.onReady();
                // } else {
                //     ctrl.requiredPara = true;
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
