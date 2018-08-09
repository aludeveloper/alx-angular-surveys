angular.module('mwFormBuilder').directive('mwFormPageRowBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageBuilder',
        scope: {
            formPage: '=',
            formObject: '=',
            rowIndex: '='
        },
        templateUrl: 'mw-form-page-row-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["mwFormUuid","mwFormBuilderOptions","$timeout", function(mwFormUuid,mwFormBuilderOptions,$timeout){
            var ctrl = this;

            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                console.log("ctrl.formPage",ctrl.rowIndex, ctrl.formPage);
                // if(ctrl.pageElement.type=='question'){
                //     if(!ctrl.pageElement.question){
                //         ctrl.pageElement.question={
                //             id: mwFormUuid.get(),
                //             text: null,
                //             type:null,
                //             required:true
                //         };
                //     }
                // }else if(ctrl.pageElement.type=='image'){
                //     if(!ctrl.pageElement.image){
                //         ctrl.pageElement.image={
                //             id: mwFormUuid.get(),
                //             align: 'left'
                //         };
                //     }

                // }else if(ctrl.pageElement.type=='paragraph'){
                //     if(!ctrl.pageElement.paragraph){
                //         ctrl.pageElement.paragraph={
                //             id: mwFormUuid.get(),
                //             html: ''
                //         };
                //     }
                // }else if(ctrl.pageElement.type=='paragraphcondition'){
                //     // debugger;
                //     if(!ctrl.pageElement.paragraphcondition){
                //         ctrl.pageElement.paragraphcondition={
                //             id: mwFormUuid.get(),
                //             html: ''
                //         };
                //         ctrl.pageElement.paragraphconditionfalse={
                //             id: mwFormUuid.get(),
                //             html: ''
                //         };
                //         ctrl.pageElement.paragraphconditionunset={
                //             id: mwFormUuid.get(),
                //             html: ''
                //         };
                //         ctrl.pageElement.paragraphconditionsubtext={
                //             id: mwFormUuid.get(),
                //             html: ''
                //         };
                //         ctrl.pageElement.selecteditem={
                //             id: mwFormUuid.get(),                            
                //             sfkey: ''
                //         };
                //     }
                // }else if(ctrl.pageElement.type=='videolink'){
                //     console.log("videolink");
                //     if(!ctrl.pageElement.videolink){
                //         ctrl.pageElement.videolink={
                //             id: mwFormUuid.get(),
                //             html: ''
                //         };
                //     }
                // }
            };

            ctrl.callback = function($event,element){
                $event.preventDefault();
                $event.stopPropagation();
                if (element.callback && typeof element.callback === "function") {
                    element.callback(ctrl.pageElement);
                }
            };

            ctrl.filter = function(button){
                if(!button.showInOpen && ctrl.isActive){
                    return false;
                }
                if(!button.showInPreview && !ctrl.isActive){
                    return false;
                }

                if (button.filter && typeof button.filter === "function") {
                    return button.filter(ctrl.pageElement);
                }
                return true;
            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }

            function createEmptyElement(type,orderNo){
                return {
                    id: mwFormUuid.get(),
                    orderNo: orderNo,
                    type: type
                };
            }

            ctrl.isElementActive= function(element){
                return ctrl.activeElement==element;
            };

            ctrl.selectElement = function(element){
                ctrl.activeElement=element;
                if (ctrl.activeElement.type == 'paragraph') {
                    $timeout(function() {
                        $('.summernote').summernote({focus: true});
                    }, 1000);
                }
            };

            ctrl.onElementReady = function(){
                $timeout(function(){
                    ctrl.activeElement=null;
                });
            };

            ctrl.addElement = function(type,rowIndex){
                var element;
                if(!type){

                    type=mwFormBuilderOptions.elementTypes[0];
                }
                for(var i=0; i<=rowIndex; i++){
                    element = createEmptyElement(type, ctrl.formPage.rows[i].elements.length + 1);
                    ctrl.activeElement=element;
                    ctrl.formPage.rows[i].elements.push(element);
                }
                
                console.log(ctrl.formPage);
            };

            ctrl.isElementTypeEnabled = function(elementType){
                return mwFormBuilderOptions.elementTypes.indexOf(elementType) !== -1;
            };

            ctrl.addQuestion = function(rowIndex){
                ctrl.addElement('question',rowIndex);
            };
        }],
        link: function (scope, ele, attrs, pageBuilderCtrl){
            var ctrl = scope.ctrl;
            /*ctrl.possiblePageFlow = pageBuilderCtrl.possiblePageFlow;

            ctrl.hoverIn = function(){
                ctrl.isHovered = true;
            };

            ctrl.hoverOut = function(){
                ctrl.isHovered = false;
            };

            ctrl.editElement=function(){
                pageBuilderCtrl.selectElement(ctrl.pageElement);
            };

            ctrl.cloneElement=function($event){
                $event.preventDefault();
                $event.stopPropagation();
                pageBuilderCtrl.cloneElement(ctrl.pageElement);
            };

            ctrl.removeElement=function(){
                pageBuilderCtrl.removeElement(ctrl.pageElement);
            };

            ctrl.moveDown= function(){
                pageBuilderCtrl.moveDownElement(ctrl.pageElement);
            };
            ctrl.moveUp= function(){
                pageBuilderCtrl.moveUpElement(ctrl.pageElement);
            };

            ctrl.options = pageBuilderCtrl.options;
            ctrl.onImageSelection = pageBuilderCtrl.onImageSelection;*/
        }
    };
});
