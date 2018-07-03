angular.module('mwFormBuilder', ['ngSanitize','ng-sortable', 'pascalprecht.translate']);

angular.module('mwFormBuilder')
    .service('mwFormUuid', function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        this.get = function () {
            return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();


        };
    })
    .factory('mwFormClone', ["mwFormUuid", function (mwFormUuid) {
        var service = {};
        var checkedObjects = [];

        service.resetIds = function (obj, root) {
            if (root) {
                checkedObjects = [];
            }
            if (checkedObjects.indexOf(obj) >= 0) {
                return;
            }
            checkedObjects.push(obj);
            if (!obj === Object(obj)) {
                return;
            }

            if (Array.isArray(obj)) {
                obj.forEach(service.resetIds);
                return;
            }

            for (var property in obj) {
                if (obj.hasOwnProperty(property)) {
                    service.resetIds(obj[property]);
                }
            }

            if (obj.hasOwnProperty('id')) {
                var newId = mwFormUuid.get();
                var oldId = obj.id;
                obj.id = newId;
            }
        };

        service.cloneElement = function (pageElement) {
            var element = {};
            angular.copy(pageElement, element);
            service.resetIds(element, true);
            return element;
        };

        service.clonePage = function (formPage) {
            var _page = {};
            angular.copy(formPage, _page);
            _page.id = mwFormUuid.get();
            var _elements = [];
            if (Array.isArray(formPage.elements)) {
                for (var i = 0; i < formPage.elements.length; i++) {
                    _elements.push(service.cloneElement(formPage.elements[i]));
                }
            }
            _page.elements = _elements;
            return _page;
        };

        service.cloneForm = function (form) {
            var _form = {};
            angular.copy(form, _form);
            var _pages = [];
            if (Array.isArray(form.pages)) {
                for (var i = 0; i < form.pages.length; i++) {
                    _pages.push(service.clonePage(form.pages[i]));
                }
            }
            _form.pages = _pages;
            return _form;
        };

        return service;

    }]);

angular.module('mwFormBuilder').directive('mwQuestionPriorityListBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormQuestionBuilder',
        scope: {
            question: '=',
            readOnly: '=?',
            options: '=?'
        },
        templateUrl: 'mw-question-priority-list-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["mwFormUuid", function(mwFormUuid){
            var ctrl = this;
            ctrl.isNewItem = {};

            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            this.$onInit = function() {
                if(!ctrl.question.priorityList){
                    ctrl.question.priorityList = [];
                    ctrl.addNewItem();
                }

                sortByOrderNo(ctrl.question.priorityList);

                ctrl.itemsSortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    handle: ".drag-handle",
                    onEnd: function(e, ui) {
                        updateOrderNo(ctrl.question.priorityList);
                    }
                };
            };

            ctrl.addNewItem=function(noFocus){

                var item = {
                    id: mwFormUuid.get(),
                    orderNo: ctrl.question.priorityList.length + 1,
                    value: null
                };
                if(!noFocus){
                    ctrl.isNewItem[item.id]=true;
                }

                ctrl.question.priorityList.push(item);
            };

            function updateOrderNo(array) {
                if(array){
                    for(var i=0; i<array.length; i++){
                        var item = array[i];
                        item.orderNo = i+1;
                    }
                }
            }

            function sortByOrderNo(array) {
                array.sort(function (a, b) {
                   return a.orderNo - b.orderNo;
               });
            }

            ctrl.removeItem=function(item){
                var index =  ctrl.question.priorityList.indexOf(item);
                if(index!=-1){
                    ctrl.question.priorityList.splice(index,1);
                }
            };

            ctrl.keyPressedOnInput= function(keyEvent, item){
                delete ctrl.isNewItem[item.id];
                if (keyEvent.which === 13){
                    keyEvent.preventDefault();
                    ctrl.addNewItem();
                }
            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                this.$onInit();
            }
        }],
        link: function (scope, ele, attrs, formQuestionBuilderCtrl){
            var ctrl = scope.ctrl;
        }
    };
});

angular.module('mwFormBuilder').directive('mwQuestionOfferedAnswerListBuilder', function() {

	return {
		replace: true,
		restrict: 'AE',
		require: '^mwFormQuestionBuilder',
		scope: {
			question: '=',
			formObject: '=',
			readOnly: '=?',
			options: '=?',
			disableOtherAnswer: '=?',
			fileReader: '='
		},
		templateUrl: 'mw-question-offered-answer-list-builder.html',
		controllerAs: 'ctrl',
		bindToController: true,
		controller: ["FormQuestionBuilderId", "mwFormUuid", function(FormQuestionBuilderId, mwFormUuid) {
			var ctrl = this;


			// Put initialization logic inside `$onInit()`
			// to make sure bindings have been initialized.
			this.$onInit = function() {
				ctrl.config = {
					radio: {},
					checkbox: {}
				};

				ctrl.isNewAnswer = {};

				sortAnswersByOrderNo();

				ctrl.offeredAnswersSortableConfig = {
					disabled: ctrl.readOnly,
					ghostClass: "beingDragged",
					handle: ".drag-handle",
					onEnd: function(e, ui) {
						updateAnswersOrderNo();
					}
				};
			};


			function updateAnswersOrderNo() {
				if (ctrl.question.offeredAnswers) {
					for (var i = 0; i < ctrl.question.offeredAnswers.length; i++) {

						var offeredAnswer = ctrl.question.offeredAnswers[i];

						offeredAnswer.orderNo = i + 1;
					}
				}

			}

			function sortAnswersByOrderNo() {
				if (ctrl.question.offeredAnswers) {
					ctrl.question.offeredAnswers.sort(function(a, b) {
						return a.orderNo - b.orderNo;
					});
				}
			}

			ctrl.addNewOfferedAnswer = function() {
				var defaultPageFlow = ctrl.possiblePageFlow[0];
				var answer = {
					id: mwFormUuid.get(),
					orderNo: ctrl.question.offeredAnswers.length + 1,
					value: null,
					pageFlow: defaultPageFlow,
					linkedquestion: null
				};
				ctrl.isNewAnswer[answer.id] = true;
				ctrl.question.offeredAnswers.push(answer);
			};

			ctrl.removeOfferedAnswer = function(answer) {
				var index = ctrl.question.offeredAnswers.indexOf(answer);
				if (index != -1) {
					ctrl.question.offeredAnswers.splice(index, 1);
				}
			};

			ctrl.addCustomAnswer = function() {
				ctrl.question.otherAnswer = true;
			};
			ctrl.removeCustomAnswer = function() {
				ctrl.question.otherAnswer = false;
			};

			ctrl.processData = function(allText) {
				// split content based on new line
				var allTextLines = allText.split(/\r\n|\n/);
				var headers = allTextLines[0].split(',');
				var lines = [];
				var defaultPageFlow = ctrl.possiblePageFlow[0];

				for (var i = 0; i < allTextLines.length; i++) {
					var answer;
					// split content based on comma
					var data = allTextLines[i].split(',');
					if (data.length == headers.length) {
						for (var j = 0; j < headers.length; j++) {
							answer = {
								id: mwFormUuid.get(),
								orderNo: ctrl.question.offeredAnswers.length + 1,
								value: data[j],
								pageFlow: defaultPageFlow,
								linkedquestion: null
							};
							ctrl.question.offeredAnswers.push(answer);
							ctrl.isNewAnswer[answer.id] = true;
						}
					}
				}
			};

			ctrl.keyPressedOnInput = function(keyEvent, answer) {
				delete ctrl.isNewAnswer[answer.id];
				if (keyEvent.which === 13) {
					keyEvent.preventDefault()
					ctrl.addNewOfferedAnswer();
				}
			};

			// Prior to v1.5, we need to call `$onInit()` manually.
			// (Bindings will always be pre-assigned in these versions.)
			if (angular.version.major === 1 && angular.version.minor < 5) {
				this.$onInit();
			}
		}],
		link: function(scope, ele, attrs, formQuestionBuilderCtrl) {
			var ctrl = scope.ctrl;
			ctrl.possiblePageFlow = formQuestionBuilderCtrl.possiblePageFlow;

			ctrl.elements = formQuestionBuilderCtrl.formObject.pages[0].elements;
			//file uploads
			ele.bind("change", function(changeEvent) {
				var files = changeEvent.target.files;
				var reader = new FileReader();
				if (files.length > 0) {
					reader.onload = function(e) {
						var contents = e.target.result;
					};
					reader.readAsText(files[0]);
					setTimeout(function() {
						ctrl.processData(reader.result);
					}, 100);
				}
			});
		}
	};
});
angular.module('mwFormBuilder').directive('mwQuestionGridBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormQuestionBuilder',
        scope: {
            question: '=',
            formObject: '=',
            readOnly: '=?',
            options: '=?'
        },
        templateUrl: 'mw-question-grid-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["mwFormUuid", "MW_GRID_CELL_INPUT_TYPES", function(mwFormUuid, MW_GRID_CELL_INPUT_TYPES){
            var ctrl = this;

            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            this.$onInit = function() {
                ctrl.cellInputTypes = MW_GRID_CELL_INPUT_TYPES;
                ctrl.isNewInput = {};

                if(!ctrl.question.grid){

                    ctrl.question.grid = {
                        rows:[],
                        cols:[]
                    };
                    ctrl.addNewRow();
                    ctrl.addNewCol(true);
                }

                if(!ctrl.question.grid.cellInputType){
                    ctrl.question.grid.cellInputType = ctrl.cellInputTypes[0];
                }



                sortByOrderNo(ctrl.question.grid.rows);
                sortByOrderNo(ctrl.question.grid.cols);

                ctrl.rowsSortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    handle: ".drag-handle",
                    onEnd: function(e, ui) {
                        updateOrderNo(ctrl.question.grid.rows);
                    }
                };
                ctrl.colsSortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    handle: ".drag-handle",
                    onEnd: function(e, ui) {
                        updateOrderNo(ctrl.question.grid.cols);
                    }
                };
            };





            ctrl.addNewRow=function(noFocus){

                var row = {
                    id: mwFormUuid.get(),
                    orderNo: ctrl.question.grid.rows.length + 1,
                    label: null
                };
                if(!noFocus){
                    ctrl.isNewInput[row.id]=true;
                }

                ctrl.question.grid.rows.push(row);
            };

            ctrl.addNewCol=function(noFocus){

                var col = {
                    id: mwFormUuid.get(),
                    orderNo: ctrl.question.grid.cols.length + 1,
                    label: null
                };
                if(!noFocus){
                    ctrl.isNewInput[col.id]=true;
                }

                ctrl.question.grid.cols.push(col);
            };



            function updateOrderNo(array) {
                if(array){
                    for(var i=0; i<array.length; i++){
                        var item = array[i];
                        item.orderNo = i+1;
                    }
                }
            }

            function sortByOrderNo(array) {
                array.sort(function (a, b) {
                   return a.orderNo - b.orderNo;
               });
            }

            ctrl.removeRow=function(row){
                var index =  ctrl.question.grid.rows.indexOf(row);
                if(index!=-1){
                    ctrl.question.grid.rows.splice(index,1);
                }
            };
            ctrl.removeCol=function(col){
                var index =  ctrl.question.grid.cols.indexOf(col);
                if(index!=-1){
                    ctrl.question.grid.cols.splice(index,1);
                }
            };

            ctrl.keyPressedOnInput= function(keyEvent, input, type){
                delete ctrl.isNewInput[input.id];
                if (keyEvent.which === 13){
                    keyEvent.preventDefault();
                    if(type=='row'){
                        ctrl.addNewRow();
                    }else{
                        ctrl.addNewCol();
                    }

                }


            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                this.$onInit();
            }
        }],
        link: function (scope, ele, attrs, formQuestionBuilderCtrl){
            var ctrl = scope.ctrl;
        }
    };
});

angular.module('mwFormBuilder').directive('mwQuestionDivisionBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormQuestionBuilder',
        scope: {
            question: '=',
            readOnly: '=?',
            options: '=?'
        },
        templateUrl: 'mw-question-division-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["mwFormUuid", function(mwFormUuid){
            var ctrl = this;
            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                ctrl.isNewItem = {};
                if(!ctrl.question.divisionList){
                    ctrl.question.divisionList = [];
                    ctrl.addNewItem();
                }
                sortByOrderNo(ctrl.question.divisionList);

                ctrl.itemsSortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    handle: ".drag-handle",
                    onEnd: function(e, ui) {
                        updateOrderNo(ctrl.question.divisionList);
                    }
                };
            };


            ctrl.addNewItem=function(noFocus){

                var item = {
                    id: mwFormUuid.get(),
                    orderNo: ctrl.question.divisionList.length + 1,
                    value: null
                };
                if(!noFocus){
                    ctrl.isNewItem[item.id]=true;
                }

                ctrl.question.divisionList.push(item);
            };


            function updateOrderNo(array) {
                if(array){
                    for(var i=0; i<array.length; i++){
                        var item = array[i];
                        item.orderNo = i+1;
                    }
                }

            }

            function sortByOrderNo(array) {
                array.sort(function (a, b) {
                   return a.orderNo - b.orderNo;
               });
            }

            ctrl.removeItem=function(item){
                var index =  ctrl.question.divisionList.indexOf(item);
                if(index!=-1){
                    ctrl.question.divisionList.splice(index,1);
                }
            };

            ctrl.keyPressedOnInput= function(keyEvent, item){
                delete ctrl.isNewItem[item.id];
                if (keyEvent.which === 13){
                    keyEvent.preventDefault();
                    ctrl.addNewItem();
                }
            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }
        }],
        link: function (scope, ele, attrs, formQuestionBuilderCtrl){
            var ctrl = scope.ctrl;
        }
    };
});

angular.module('mwFormBuilder').directive('mwLabel', function () {

    return {
        replace: true,
        restrict: 'AE',
        scope: {
            labelKey: "@?",
            labelText: "@?",
            labelFor: "@",
            labelClass: "@",
            labelTranslateValues: "="
        },
        templateUrl: 'mw-label.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["mwFormUuid", function(mwFormUuid){
            var ctrl = this;
        }],
        link: function (scope, ele, attrs){

        }
    };
});

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

angular.module('mwFormBuilder').factory("FormQuestionBuilderId", function(){
    var id = 0;
        return {
            next: function(){
                return ++id;
            }
        }
    })

    .directive('mwFormQuestionBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageElementBuilder',
        scope: {
            question: '=',
            formObject: '=',
            onReady: '&',
            isPreview: '=?',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-question-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["$timeout", "FormQuestionBuilderId", "mwFormBuilderOptions", function($timeout,FormQuestionBuilderId, mwFormBuilderOptions){
            var ctrl = this;


            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                ctrl.id = FormQuestionBuilderId.next();
                ctrl.questionTypes = mwFormBuilderOptions.questionTypes;
                ctrl.formSubmitted=false;

                sortAnswersByOrderNo();

                ctrl.offeredAnswersSortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    handle: ".drag-handle",
                    onEnd: function(e, ui) {
                        updateAnswersOrderNo();
                    }
                };
            };


            function updateAnswersOrderNo() {
                if(ctrl.question.offeredAnswers){
                    for(var i=0; i<ctrl.question.offeredAnswers.length; i++){
                        ctrl.question.offeredAnswers[i].orderNo = i+1;
                    }
                }

            }

            function sortAnswersByOrderNo() {
                if(ctrl.question.offeredAnswers) {
                    ctrl.question.offeredAnswers.sort(function (a, b) {
                        return a.orderNo - b.orderNo;
                    });
                }
            }

            ctrl.save=function(){
                ctrl.formSubmitted=true;
                if(ctrl.form.$valid){
                    ctrl.onReady();
                }

            };



            var questionTypesWithOfferedAnswers = ['radio', 'checkbox', 'select'];

            ctrl.questionTypeChanged = function(){
                if( questionTypesWithOfferedAnswers.indexOf(ctrl.question.type) !== -1){
                    if(!ctrl.question.offeredAnswers){
                        ctrl.question.offeredAnswers=[];
                    }

                }
                if(ctrl.question.type != 'radio'){
                    clearCustomPageFlow();
                    $timeout(function(){
                        ctrl.question.pageFlowModifier=false;
                    });

                }
                if( questionTypesWithOfferedAnswers.indexOf(ctrl.question.type) === -1){
                    delete ctrl.question.offeredAnswers;
                }
                if(ctrl.question.type != 'grid'){
                    delete ctrl.question.grid;
                }

                if(ctrl.question.type != 'priority'){
                    delete ctrl.question.priorityList;
                }


            };

            function clearCustomPageFlow() {

                if(!ctrl.question.offeredAnswers){
                    return;
                }

                ctrl.question.offeredAnswers.forEach(function (answer) {
                    if(ctrl.question.pageFlowModifier){
                        answer.pageFlow = ctrl.possiblePageFlow[0];
                    }else{
                        delete answer.pageFlow;
                    }

                });
            }

            ctrl.pageFlowModifierChanged = function(){
                clearCustomPageFlow();
            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }

        }],
        link: function (scope, ele, attrs, formPageElementBuilder){
            var ctrl = scope.ctrl;
            ctrl.possiblePageFlow = formPageElementBuilder.possiblePageFlow;
            ctrl.options = formPageElementBuilder.options;
        }
    };
});

angular.module('mwFormBuilder').factory("FormParagraphConditionBuilderId", function(){
    var id = 0;
        return {
            next: function(){
                return ++id;
            }
        }
    })

    .directive('mwFormParagraphConditionBuilder', ["$rootScope", function ($rootScope) {

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
}]);

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

            ctrl.save=function(){
                ctrl.formSubmitted=true;
                if(ctrl.form.$valid){
                    ctrl.onReady();
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
        }
    };
});

angular.module('mwFormBuilder').directive('mwFormPageElementBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageBuilder',
        scope: {
            pageElement: '=',
            formObject: '=',
            isActive: '=',
            isFirst: '=',
            isLast: '=',
            onReady: '&',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-page-element-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["mwFormUuid", function(mwFormUuid){
            var ctrl = this;

            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                if(ctrl.pageElement.type=='question'){
                    if(!ctrl.pageElement.question){
                        ctrl.pageElement.question={
                            id: mwFormUuid.get(),
                            text: null,
                            type:null,
                            required:true
                        };
                    }
                }else if(ctrl.pageElement.type=='image'){
                    if(!ctrl.pageElement.image){
                        ctrl.pageElement.image={
                            id: mwFormUuid.get(),
                            align: 'left'
                        };
                    }

                }else if(ctrl.pageElement.type=='paragraph'){
                    if(!ctrl.pageElement.paragraph){
                        ctrl.pageElement.paragraph={
                            id: mwFormUuid.get(),
                            html: ''
                        };
                    }
                }else if(ctrl.pageElement.type=='paragraphcondition'){
                    // debugger;
                    if(!ctrl.pageElement.paragraphcondition){
                        ctrl.pageElement.paragraphcondition={
                            id: mwFormUuid.get(),
                            html: ''
                        };
                        ctrl.pageElement.paragraphconditionfalse={
                            id: mwFormUuid.get(),
                            html: ''
                        };
                        ctrl.pageElement.paragraphconditionunset={
                            id: mwFormUuid.get(),
                            html: ''
                        };
                        ctrl.pageElement.paragraphconditionsubtext={
                            id: mwFormUuid.get(),
                            html: ''
                        };
                        ctrl.pageElement.selecteditem={
                            id: mwFormUuid.get(),                            
                            sfkey: ''
                        };
                    }
                }else if(ctrl.pageElement.type=='videolink'){
                    console.log("videolink");
                    if(!ctrl.pageElement.videolink){
                        ctrl.pageElement.videolink={
                            id: mwFormUuid.get(),
                            html: ''
                        };
                    }
                }
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
        }],
        link: function (scope, ele, attrs, pageBuilderCtrl){
            var ctrl = scope.ctrl;
            ctrl.possiblePageFlow = pageBuilderCtrl.possiblePageFlow;

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
            ctrl.onImageSelection = pageBuilderCtrl.onImageSelection;
        }
    };
});

angular.module('mwFormBuilder').directive('mwFormPageBuilder', ["$rootScope", function ($rootScope) {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormBuilder',
        scope: {
            formPage: '=',
            formObject: '=',
            isFirst: '=',
            isLast: '=',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-page-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["$timeout", "mwFormUuid", "mwFormClone", "mwFormBuilderOptions", function($timeout, mwFormUuid, mwFormClone, mwFormBuilderOptions){
            var ctrl = this;
            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                ctrl.hoverEdit = false;
                ctrl.formPage.namedPage = !!ctrl.formPage.name;
                ctrl.isFolded = false;
                sortElementsByOrderNo();

                ctrl.sortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    group: "survey",
                    handle: ".inactive",
                    //cancel: ".not-draggable",
                    chosenClass: ".page-element-list",
                    onEnd: function(e, ui) {
                        updateElementsOrderNo();
                    }
                };

                ctrl.activeElement = null;
            };

            ctrl.unfold = function(){
                ctrl.isFolded = false;
            };
            ctrl.fold = function(){
                ctrl.isFolded = true;
            };


            function updateElementsOrderNo() {
                for(var i=0; i<ctrl.formPage.elements.length; i++){
                    ctrl.formPage.elements[i].orderNo = i+1;
                }
            }


            function sortElementsByOrderNo() {
                ctrl.formPage.elements.sort(function(a,b){
                    return a.orderNo - b.orderNo;
                });
            }
            ctrl.pageNameChanged = function(){
                $rootScope.$broadcast('mwForm.pageEvents.pageNameChanged', {page: ctrl.formPage});
            };



            ctrl.addElement = function(type){
                if(!type){

                    type=mwFormBuilderOptions.elementTypes[0];
                }
                var element = createEmptyElement(type, ctrl.formPage.elements.length + 1);
                ctrl.activeElement=element;
                ctrl.formPage.elements.push(element);
            };

            ctrl.cloneElement = function(pageElement, setActive){
                var index = ctrl.formPage.elements.indexOf(pageElement);
                var element = mwFormClone.cloneElement(pageElement);
                if(setActive){
                    ctrl.activeElement=element;
                }
                ctrl.formPage.elements.splice(index,0, element);

            };

            ctrl.removeElement = function(pageElement){
                var index = ctrl.formPage.elements.indexOf(pageElement);
                ctrl.formPage.elements.splice(index,1);
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

            ctrl.addQuestion = function(){
                ctrl.addElement('question');
            };

            ctrl.addImage = function(){
                ctrl.addElement('image');
            };

            ctrl.addParagraph= function(){
                ctrl.addElement('paragraph');
            };

            ctrl.addParagraphCondition= function(){
                ctrl.addElement('paragraphcondition');
            };

            ctrl.addVideoLink= function(){
                ctrl.addElement('videolink');
            };
            
            ctrl.isElementActive= function(element){
                return ctrl.activeElement==element;
            };

            ctrl.selectElement = function(element){
                ctrl.activeElement=element;
            };

            ctrl.onElementReady = function(){
                $timeout(function(){
                    ctrl.activeElement=null;
                });
            };

            function createEmptyElement(type,orderNo){
                return {
                    id: mwFormUuid.get(),
                    orderNo: orderNo,
                    type: type
                };
            }

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


            ctrl.updateElementsOrderNo = updateElementsOrderNo;

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }

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
}]);
angular.module('mwFormBuilder').factory("FormImageBuilderId", function(){
    var id = 0;
        return {
            next: function(){
                return ++id;
            }
        }
    })

    .directive('mwFormImageBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormPageElementBuilder',
        scope: {
            image: '=',
            formObject: '=',
            onReady: '&',
            isPreview: '=?',
            readOnly: '=?',
            onImageSelection: '&'
        },
        templateUrl: 'mw-form-image-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["$timeout", "FormImageBuilderId", "mwFormUuid", function($timeout,FormImageBuilderId, mwFormUuid){
            var ctrl = this;
            ctrl.id = FormImageBuilderId.next();
            ctrl.formSubmitted=false;

            ctrl.save=function(){
                ctrl.formSubmitted=true;
                if(ctrl.form.$valid){
                    ctrl.onReady();
                }
            };

            ctrl.selectImageButtonClicked = function(){
                var resultPromise = ctrl.onImageSelection();
                resultPromise.then(function(imageSrc){
                   ctrl.image.src = imageSrc;

                }).catch(function(){

                });
            };

            ctrl.selectImage= function(input) {
                var imgType = input.files[0].type;
                if(imgType=="image/jpeg" || imgType=="image/jpg" || imgType=="image/png" || imgType=="image/tif" )
                {
                    if (input.files && input.files[0]) {
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            $('#myImage')
                                .attr('src', e.target.result)
                                .width(150)
                                .height(200);
                            ctrl.image.src=e.target.result;
                        };
                        reader.readAsDataURL(input.files[0]);
                    }
                }
                else {
                    alert("Only jpg/jpeg and png files are allowed!");
                }
            }

            ctrl.setAlign = function(align){
                ctrl.image.align = align;
            }


        }],
        link: function (scope, ele, attrs, formPageElementBuilder){
            var ctrl = scope.ctrl;
        }
    };
});

angular.module('mwFormBuilder').directive('mwFormConfirmationPageBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        scope: {
            formObject: '=',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-confirmation-page-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["$timeout", function($timeout){
            var ctrl = this;
            ctrl.hoverEdit = false;


            ctrl.hoverIn = function(){
                ctrl.hoverEdit = true;
            };

            ctrl.hoverOut = function(){
                ctrl.hoverEdit = false;
            };

        }],
        link: function (scope, ele, attrs){

        }
    };
});

angular.module('mwFormBuilder').directive('mwFormBuilder', ["$rootScope", function ($rootScope) {

    return {
        replace: true,
        restrict: 'AE',
        scope: {
            formData: '=',
            readOnly: '=?',
            options: '=?',
            formStatus: '=?',
            onImageSelection: '&',
            api: '=?'
        },
        templateUrl: 'mw-form-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["mwFormUuid", "MW_QUESTION_TYPES", "mwFormBuilderOptions", function(mwFormUuid, MW_QUESTION_TYPES, mwFormBuilderOptions){
            var ctrl = this;
            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                ctrl.currentPage = 0;

                if(!ctrl.formData.pages || !ctrl.formData.pages.length){
                    ctrl.formData.pages = [];
                    ctrl.formData.pages.push(createEmptyPage(1));
                }

                ctrl.options = mwFormBuilderOptions.$init(ctrl.options);

                if(ctrl.api){
                    ctrl.api.reset = function(){
                        for (var prop in ctrl.formData) {
                            if (ctrl.formData.hasOwnProperty(prop) && prop != 'pages') {
                                delete ctrl.formData[prop];
                            }
                        }

                        ctrl.formData.pages.length=0;
                        ctrl.formData.pages.push(createEmptyPage(1));

                    }
                }
            };
            

            ctrl.numberOfPages=function(){
                return Math.ceil(ctrl.formData.pages.length/ctrl.options.pageSize);                
            };
            ctrl.lastPage = function(){
               ctrl.currentPage = Math.ceil(ctrl.formData.pages.length/ctrl.options.pageSize - 1); 
            };
            ctrl.addPage = function(){
                ctrl.formData.pages.push(createEmptyPage(ctrl.formData.pages.length+1));
                ctrl.lastPage();
                $rootScope.$broadcast("mwForm.pageEvents.pageAdded");
            };
            ctrl.onChangePageSize = function(){
                if(ctrl.currentPage > Math.ceil(ctrl.formData.pages.length/ctrl.options.pageSize - 1)){
                   ctrl.currentPage = Math.ceil(ctrl.formData.pages.length/ctrl.options.pageSize - 1); 
                }
            };
            

            function createEmptyPage(number){
                var defaultPageFlow = null;
                if(ctrl.possiblePageFlow){
                    defaultPageFlow = ctrl.possiblePageFlow[0];
                }

                return {
                    id: mwFormUuid.get(),
                    number: number,
                    name: null,
                    description: null,
                    pageFlow: defaultPageFlow,
                    elements: []
                };
            }

            function updatePageNumbers() {
                for(var i=0; i<ctrl.formData.pages.length; i++){
                    ctrl.formData.pages[i].number = i+1;
                }
                ctrl.updatePageFlow();
            }

            ctrl.addPageAfter=function(page){
                var index = ctrl.formData.pages.indexOf(page);
                var newIndex = index+1;
                var newPage = createEmptyPage(page.number+1);
                if(newIndex<ctrl.formData.pages.length){
                    ctrl.formData.pages.splice(newIndex,0, newPage);
                }else{
                    ctrl.formData.pages.push(newPage);
                }
                updatePageNumbers();
                $rootScope.$broadcast("mwForm.pageEvents.pageAdded");

            };

            ctrl.moveDownPage= function(page){
                var fromIndex = ctrl.formData.pages.indexOf(page);
                var toIndex=fromIndex+1;
                if(toIndex<ctrl.formData.pages.length){
                    arrayMove(ctrl.formData.pages, fromIndex, toIndex);
                }
                updatePageNumbers();
                $rootScope.$broadcast("mwForm.pageEvents.pageMoved");

            };

            ctrl.moveUpPage= function(page){
                var fromIndex = ctrl.formData.pages.indexOf(page);
                var toIndex=fromIndex-1;
                if(toIndex>=0){
                    arrayMove(ctrl.formData.pages, fromIndex, toIndex);
                }
                updatePageNumbers();
                $rootScope.$broadcast("mwForm.pageEvents.pageMoved");

            };

            ctrl.removePage=function(page){
                var index = ctrl.formData.pages.indexOf(page);
                ctrl.formData.pages.splice(index,1);
                updatePageNumbers();
                $rootScope.$broadcast("mwForm.pageEvents.pageRemoved");
                ctrl.onChangePageSize();
            };

            function arrayMove(arr, fromIndex, toIndex) {
                var element = arr[fromIndex];
                arr.splice(fromIndex, 1);
                arr.splice(toIndex, 0, element);
            }

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }

        }],
        link: function (scope, ele, attrs){
            var ctrl = scope.ctrl;
            if(ctrl.formStatus){
                ctrl.formStatus.form = ctrl.form;
            }

            ctrl.possiblePageFlow = [];
            var defaultPageFlow = {
                nextPage: true,
                label: 'mwForm.pageFlow.goToNextPage'
            };
            ctrl.possiblePageFlow.push(defaultPageFlow);
            ctrl.isSamePageFlow = function (p1, p2){
                return (p1.page && p2.page &&  p1.page.id==p2.page.id) || p1.formSubmit && p2.formSubmit || p1.nextPage && p2.nextPage;
            };

            ctrl.updatePageFlow = function(){
                ctrl.possiblePageFlow.length=1;

                ctrl.formData.pages.forEach(function(page){

                    ctrl.possiblePageFlow.push({
                        page:{
                            id: page.id,
                            number: page.number
                        },
                        label: 'mwForm.pageFlow.goToPage'
                    });
                });

                ctrl.possiblePageFlow.push({
                    formSubmit:true,
                    label: 'mwForm.pageFlow.submitForm'
                });
                ctrl.formData.pages.forEach(function(page){
                    ctrl.possiblePageFlow.forEach(function(pageFlow){
                        if(page.pageFlow) {
                            if(ctrl.isSamePageFlow(pageFlow, page.pageFlow)){
                                page.pageFlow = pageFlow;
                            }
                        }else{
                            page.pageFlow = defaultPageFlow;
                        }

                        page.elements.forEach(function(element){
                            var question = element.question;
                            if(question && question.pageFlowModifier){
                                question.offeredAnswers.forEach(function(answer){
                                    if(answer.pageFlow){
                                        if(ctrl.isSamePageFlow(pageFlow, answer.pageFlow)){
                                            answer.pageFlow = pageFlow;
                                        }
                                    }
                                });
                            }

                        });
                    });
                });
            };

            scope.$watch('ctrl.formData.pages.length', function(newVal, oldVal){
                ctrl.updatePageFlow();
            });
            scope.$watch('ctrl.currentPage', function(newVal, oldVal){
                $rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged",{index:ctrl.currentPage});
            });
            scope.$on('mwForm.pageEvents.changePage', function(event,data){
                if(typeof data.page !== "undefined" && data.page < ctrl.numberOfPages()){
                   ctrl.currentPage = data.page;
                }
            });
            scope.$on('mwForm.pageEvents.addPage', function(event,data){
                ctrl.addPage();
            });
        }
    };
}]);


angular.module('mwFormBuilder').filter('mwStartFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    };
});
angular.module('mwFormBuilder')
    .constant('MW_QUESTION_TYPES', ['text', 'textarea', 'radio', 'checkbox', 'select', 'grid', 'priority', 'division', 'number', 'date', 'time', 'email', 'range', 'url', 'file'])
    .constant('MW_ELEMENT_TYPES', ['question', 'image', 'paragraph', 'paragraphConditionTrue', 'videolink'])
    .constant('MW_GRID_CELL_INPUT_TYPES', ['radio', 'checkbox', 'text', 'number', 'date', 'time'])
    .factory('mwFormBuilderOptions', ["MW_ELEMENT_TYPES", "MW_QUESTION_TYPES", function mwFormBuilderOptionsFactory(MW_ELEMENT_TYPES, MW_QUESTION_TYPES){

        var defaultElementButtonOptions={
            title: null,
            icon: null,
            text: null,
            callback: null,
            filter: null,
            showInOpen:false,
            showInPreview:true,
            cssClass: ''
        };

        var defaultCustomQuestionSelectOptions={
            key: null,
            label: null,
            selects: [],
            required: true
        };

        var defaultOptions={
            elementTypes: MW_ELEMENT_TYPES,
            questionTypes: MW_QUESTION_TYPES,
            elementButtons: [],
            pagesSize: [10,25,50,100],
            pageSize: 10,
            customQuestionSelects: [],
            customElements: [] //TODO
        };

        function extendOptionList(optionList, defaultItemOptions){
            if(!optionList){
                return [];
            }
            return optionList.map(function (itemOptions){
                return angular.extend({}, defaultItemOptions, itemOptions);
            });
        }

        var options = {

            $init: function(customOptions){
                angular.extend(options, defaultOptions, customOptions);
                options.customQuestionSelects = extendOptionList(options.customQuestionSelects, defaultCustomQuestionSelectOptions);
                options.elementButtons = extendOptionList(options.elementButtons, defaultElementButtonOptions);

                return options;
            }
        };


        return options;
    }]);
angular.module('mwFormBuilder')
    .directive('wdFocusMe', ["$timeout", "$parse", function($timeout, $parse) {
        return {
            link: function(scope, element, attrs) {
                var model = $parse(attrs.wdFocusMe);
                scope.$watch(model, function(value) {
                    if(value === true) {
                        $timeout(function() {
                            element[0].focus();
                        });
                    }
                });
                element.bind('blur', function() {
                    $timeout(function() {
                        scope.$apply(model.assign(scope, false));
                    });

                });
            }
        };
    }])
    .factory('focus', ["$timeout", "$window", function($timeout, $window) {
        return function(id) {
            $timeout(function() {
                var element = $window.document.getElementById(id);
                if(element)
                    element.focus();
            });
        };
    }]);
'use strict';

angular.module('mwFormBuilder')
    .directive('mwConfirmClick', ["$window", function($window){
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var msg = attr.wdConfirmClick || "Are you sure?";
                element.bind('click',function (event) {
                    if ( $window.confirm(msg) ) {
                        scope.$apply(attr.confirmedAction);
                    }
                });
            }
        }
    }]);