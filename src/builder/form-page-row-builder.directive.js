angular.module('mwFormBuilder').directive('mwFormPageRowBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageBuilder',
        scope: {
            formPage: '=',
            rowObject: '=',
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
                console.log("ctrl.rowObject",ctrl.rowIndex, ctrl.rowObject);                
            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }

            function createEmptyElement(type,orderNo){
                console.log("createEmptyElement",type,orderNo);
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

            ctrl.cloneElement = function(pageElement, setActive){
                var index = ctrl.formPage.elements.indexOf(pageElement);
                var element = mwFormClone.cloneElement(pageElement);
                if(setActive){
                    ctrl.activeElement=element;
                }
                ctrl.formPage.elements.splice(index,0, element);

            };

            ctrl.removeElement = function(pageElement,rowIndex){
                console.log("ROW BUILDER");
                var index;
                for(var i=0; i<rowIndex; i++){
                    index = ctrl.formPage.rows[i].elements.indexOf(pageElement);
                    ctrl.formPage.rows[i].elements.splice(index,1);
                }                
            };

            ctrl.moveDownElement= function(pageElement){
                var fromIndex = ctrl.formPage.elements.indexOf(pageElement);
                var toIndex=fromIndex+1;
                if(toIndex<ctrl.formPage.elements.length){
                    arrayMove(ctrl.formPage.elements, fromIndex, toIndex);
                }
                updateElementsOrderNo();
            };

            ctrl.moveUpElement= function(pageElement){
                var fromIndex = ctrl.formPage.elements.indexOf(pageElement);
                var toIndex=fromIndex-1;
                if(toIndex>=0){
                    arrayMove(ctrl.formPage.elements, fromIndex, toIndex);
                }
                updateElementsOrderNo();
            };

            ctrl.isElementTypeEnabled = function(elementType){
                return mwFormBuilderOptions.elementTypes.indexOf(elementType) !== -1;
            };

            ctrl.addQuestion = function(rowIndex){
                ctrl.addElement('question',rowIndex);
            };

            function arrayMove(arr, fromIndex, toIndex) {
                var element = arr[fromIndex];
                arr.splice(fromIndex, 1);
                arr.splice(toIndex, 0, element);
            }

            ctrl.hoverIn = function(){
                ctrl.hoverEdit = true;
            };

            ctrl.hoverOut = function(){
                ctrl.hoverEdit = false;
            };


            //ctrl.updateElementsOrderNo = updateElementsOrderNo;
        }],
        link: function (scope, ele, attrs, formBuilderCtrl){
            var ctrl = scope.ctrl;
            ctrl.possiblePageFlow = formBuilderCtrl.possiblePageFlow;
            ctrl.moveDown= function(){
                formBuilderCtrl.moveDownPage(ctrl.formPage);
            };

            ctrl.moveUp= function(){
                formBuilderCtrl.moveUpPage(ctrl.formPage);
            };

            ctrl.removePage=function(){
                formBuilderCtrl.removePage(ctrl.formPage);
            };

            ctrl.addPage=function(){
                formBuilderCtrl.addPageAfter(ctrl.formPage);
            };

            scope.$watch('ctrl.formPage.elements.length', function(newValue, oldValue){
                if(newValue!=oldValue){
                    ctrl.updateElementsOrderNo();
                }
            });
            ctrl.options = formBuilderCtrl.options;
            ctrl.onImageSelection = formBuilderCtrl.onImageSelection;
        }
    };
});
