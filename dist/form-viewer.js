angular.module('mwFormViewer', 
					['ngSanitize', 
					'ui.bootstrap',
					'ng-sortable', 
					'pascalprecht.translate',
					'ngCookies'
					]);



angular.module('mwFormViewer')
    .directive('mwPriorityList', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormQuestion',
        scope: {
            question: '=',
            questionResponse: '=',
            readOnly: '=?',
            options: '=?'
        },
        templateUrl: 'mw-priority-list.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: function(){
            var ctrl = this;

            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            this.$onInit = function() {
                if(!ctrl.questionResponse.priorityList){
                    ctrl.questionResponse.priorityList=[];
                }
                ctrl.idToItem = {};


                sortByPriority(ctrl.questionResponse.priorityList);

                ctrl.availableItems=[];
                ctrl.question.priorityList.forEach(function(item){
                    ctrl.idToItem[item.id] = item;
                    var ordered = ctrl.questionResponse.priorityList.some(function(ordered){
                        return item.id == ordered.id;
                    });
                    if(!ordered){
                        ctrl.availableItems.push({
                            priority: null,
                            id: item.id
                        });
                    }
                });

                ctrl.allItemsOrdered=ctrl.availableItems.length==0 ? true : null;

                var baseConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged"
//                tolerance: 'pointer',
//                items: 'div',
//                revert: 100

                };

                ctrl.orderedConfig = angular.extend({}, baseConfig, {
                    group:{
                        name: 'A',
                        pull: false,
                        put: ['B']
                    },
                    onEnd: function(e, ui) {
                        updatePriority(ctrl.questionResponse.priorityList);
                    }
                });

                ctrl.availableConfig = angular.extend({}, baseConfig, {
                    sort:false,
                    group:{
                        name: 'B',
                        pull: ['A'],
                        put: false
                    },
                    onEnd: function(e, ui) {
                        updatePriority(ctrl.questionResponse.priorityList);
                        ctrl.allItemsOrdered=ctrl.availableItems.length==0 ? true : null;
                    }
                });
            };

            function updatePriority(array) {
                if(array){
                    for(var i=0; i<array.length; i++){
                        var item = array[i];
                        item.priority = i+1;
                    }
                }

            }

            function sortByPriority(array) {
                array.sort(function (a, b) {
                    return a.priority - b.priority;
                });
            }

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                this.$onInit();
            }

        },
        link: function (scope, ele, attrs, mwFormQuestion){
            var ctrl = scope.ctrl;
            ctrl.print =  mwFormQuestion.print;
        }
    };
});

angular.module('mwFormViewer').directive('mwFormViewer', ["$rootScope", function($rootScope) {

	return {
		replace: true,
		restrict: 'AE',
		scope: {
			formData: '=',
			responseData: '=',
			templateData: '=?',
			readOnly: '=?',
			options: '=?',
			formStatus: '=?', //wrapper for internal angular form object
			onSubmit: '&',
			onSave: '&',
			onBack: '&',
			api: '=?'

		},
		templateUrl: 'mw-form-viewer.html',
		controllerAs: 'ctrl',
		bindToController: true,
		controller: ["$timeout", "$interpolate", "$cookies", function($timeout, $interpolate, $cookies) {
			var ctrl = this;
			var rootScope = $rootScope;
			ctrl.largeFileFlag = false;
			ctrl.hideSaveButton = localStorage.getItem('hideSaveButton');
			if (ctrl.hideSaveButton == undefined || ctrl.hideSaveButton == '') {
				ctrl.hideSaveButton = false;
			}
			$rootScope.$on("fileRequiredFlag", function(event, flag) {
				ctrl.largeFileFlag = flag;
			});
			$rootScope.$on("hideSaveButton", function(event, flag) {
				ctrl.hideSaveButton = flag.hideSaveButton;
			});
			// Put initialization logic inside `$onInit()`
			// to make sure bindings have been initialized.
			ctrl.$onInit = function() {
				// ctrl.currentPage.elements.pra.selecteditem.value
				ctrl.condtionalParaFlag = true;
				ctrl.defaultOptions = {
					nestedForm: false,
					autoStart: false,
					disableSubmit: false
				};
				ctrl.options = angular.extend({}, ctrl.defaultOptions, ctrl.options);

				ctrl.submitStatus = 'NOT_SUBMITTED';
				ctrl.formSubmitted = false;

				sortPagesByNumber();
				ctrl.pageIdToPage = {};
				ctrl.formData.pages.forEach(function(page) {
					ctrl.pageIdToPage[page.id] = page;
				});


				ctrl.buttons = {
					prevPage: {
						visible: false,
						disabled: false
					},
					nextPage: {
						visible: false,
						disabled: false
					},
					submitForm: {
						visible: false,
						disabled: false
					}
				};
				rootScope.submitButton = ctrl.buttons.submitForm.visible;
				rootScope.formValid = ctrl.form;
				ctrl.resetPages();

				if (ctrl.api) {
					ctrl.api.reset = function() {
						for (var prop in ctrl.responseData) {
							if (ctrl.responseData.hasOwnProperty(prop)) {
								delete ctrl.responseData[prop];
							}
						}

						ctrl.buttons.submitForm.visible = false;
						rootScope.submitButton = ctrl.buttons.submitForm.visible;
						rootScope.formValid = ctrl.form;
						ctrl.buttons.prevPage.visible = false;
						ctrl.buttons.nextPage.visible = false;
						ctrl.currentPage = null;
						$timeout(ctrl.resetPages, 0);
					}
				}
			};

			ctrl.getSfFlagValue = function() {
				var conditionalParaSfKey;
				angular.forEach(ctrl.formData.pages, function(obj, key) {
					angular.forEach(obj.elements, function(obj1, key1) {
						if (obj1.selecteditem && obj1.selecteditem.sfkey && obj1.type === "paragraphcondition") {
							conditionalParaSfKey = obj1.selecteditem.sfkey.key;
						}
					});
				});

				var response;
				var auth_token = localStorage.getItem('auth_token');
				var baseURL = __env.apiUrl
				var userInfo = JSON.parse($cookies.get("userInfo"));
				var applicationData = userInfo.applicationIdMap;
				var sfAppId;
				var appName = localStorage.getItem('applicationName');
				angular.forEach(applicationData, function(value, key) {
					appName = key;
					sfAppId = value;
				});



				if (conditionalParaSfKey != "" && conditionalParaSfKey != undefined && appName != "" && appName != undefined) {
					$.ajax({
						async: false,
						headers: {
							'X-AUTH-TOKEN': auth_token,
							'content-Type': 'Application/Json'
						},
						url: baseURL + "/" + "salesforce/conditionalpara/" + conditionalParaSfKey + "/" + appName + "/" + userInfo.email,
						success: function(result) {
							console.log("Geting value", result);
							response = result;
						}
					});
				}

				ctrl.sfFlag = response;
				if (ctrl.sfFlag == "Pass") {
					ctrl.condtionalParaFlag = true;
				} else{
					ctrl.condtionalParaFlag = false;
				}
			};

			ctrl.submitForm = function() {
				ctrl.formSubmitted = true;
				ctrl.submitStatus = 'IN_PROGRESS';

				ctrl.setCurrentPage(null);


				var resultPromise = ctrl.onSubmit();
				resultPromise.then(function() {
					ctrl.submitStatus = 'SUCCESS';
				}).catch(function() {
					ctrl.submitStatus = 'ERROR';
				});
			};

			ctrl.setCurrentPage = function(page) {
				ctrl.currentPage = page;
				if (!page) {

					ctrl.buttons.submitForm.visible = false;

					$rootScope.submitButton = ctrl.buttons.submitForm.visible;

					$rootScope.formValid = ctrl.form;

					ctrl.buttons.prevPage.visible = false;

					ctrl.buttons.nextPage.visible = false;
					return;
				}

				ctrl.setDefaultNextPage();

				ctrl.initResponsesForCurrentPage();


			};


			ctrl.setDefaultNextPage = function() {
				var index = ctrl.formData.pages.indexOf(ctrl.currentPage);
				ctrl.currentPage.isFirst = index == 0;
				ctrl.currentPage.isLast = index == ctrl.formData.pages.length - 1;

				ctrl.buttons.submitForm.visible = ctrl.currentPage.isLast;
				$rootScope.submitButton = ctrl.buttons.submitForm.visible;
				$rootScope.formValid = ctrl.form;
				ctrl.buttons.prevPage.visible = !ctrl.currentPage.isFirst;

				ctrl.buttons.nextPage.visible = !ctrl.currentPage.isLast;
				if (ctrl.currentPage.isLast) {
					ctrl.nextPage = null;
				} else {
					ctrl.nextPage = ctrl.formData.pages[index + 1];
				}

				if (ctrl.currentPage.pageFlow) {
					var formSubmit = false;
					if (ctrl.currentPage.pageFlow.formSubmit) {
						ctrl.nextPage = null;
						formSubmit = true;
					} else if (ctrl.currentPage.pageFlow.page) {
						ctrl.nextPage = ctrl.pageIdToPage[ctrl.currentPage.pageFlow.page.id];
						ctrl.buttons.nextPage.visible = true;
					} else if (ctrl.currentPage.isLast) {
						ctrl.nextPage = null;
						formSubmit = true;
					}
					ctrl.buttons.submitForm.visible = formSubmit;
					$rootScope.submitButton = ctrl.buttons.submitForm.visible;
					$rootScope.formValid = ctrl.form;
					ctrl.buttons.nextPage.visible = !formSubmit;
				}
			};

			ctrl.initResponsesForCurrentPage = function() {
				ctrl.currentPage.elements.forEach(function(element) {
					var question = element.question;
					if (question && !ctrl.responseData[question.id]) {
						ctrl.responseData[question.id] = {};
					}
				});
			};

			ctrl.beginResponse = function() {
				if (ctrl.formData.pages.length > 0) {
					ctrl.setCurrentPage(ctrl.formData.pages[0]);
					$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
						currentPage: ctrl.currentPage
					});
				}
			};

			ctrl.resetPages = function() {
				ctrl.prevPages = [];

				ctrl.currentPage = null;
				ctrl.nextPage = null;
				ctrl.formSubmitted = false;
				if (ctrl.options.autoStart) {
					ctrl.beginResponse();
				}

			};


			ctrl.goToPrevPage = function() {
				window.scrollTo(0, 0);
				ctrl.onBack();
				var prevPage = ctrl.prevPages.pop();
				ctrl.setCurrentPage(prevPage);
				ctrl.updateNextPageBasedOnAllAnswers();
				$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
					currentPage: ctrl.currentPage
				});
			};

			ctrl.goToNextPage = function() {
				window.scrollTo(0, 0);
				//TODO Saving each page data on next button
				ctrl.onSave();

				ctrl.prevPages.push(ctrl.currentPage);

				ctrl.updateNextPageBasedOnAllAnswers();

				ctrl.setCurrentPage(ctrl.nextPage);
				$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
					currentPage: ctrl.currentPage
				});
			};

			ctrl.updateNextPageBasedOnAllAnswers = function() {
				ctrl.currentPage.elements.forEach(function(element) {
					ctrl.updateNextPageBasedOnPageElementAnswers(element);
				});

				ctrl.buttons.submitForm.visible = !ctrl.nextPage;
				$rootScope.submitButton = ctrl.buttons.submitForm.visible;
				$rootScope.formValid = ctrl.form;
				ctrl.buttons.nextPage.visible = !!ctrl.nextPage;
			};

			ctrl.updateNextPageBasedOnPageElementAnswers = function(element) {
				var question = element.question;
				if (question && question.pageFlowModifier) {
					question.offeredAnswers.forEach(function(answer) {
						if (answer.pageFlow) {
							if (ctrl.responseData[question.id].selectedAnswer == answer.id) {
								if (answer.pageFlow.formSubmit) {
									ctrl.nextPage = null;
								} else if (answer.pageFlow.page) {
									ctrl.nextPage = ctrl.pageIdToPage[answer.pageFlow.page.id];
								}
							}
						}
					});
				}
			};

			ctrl.onResponseChanged = function(pageElement) {
				ctrl.setDefaultNextPage();
				ctrl.updateNextPageBasedOnAllAnswers();
			};

			function sortPagesByNumber() {
				ctrl.formData.pages.sort(function(a, b) {
					return a.number - b.number;
				});
			}

			ctrl.print = function(input) {
				if (input && ctrl.templateData) {
					return $interpolate(input)(ctrl.templateData);
				}
				return input;
			};

			// Prior to v1.5, we need to call `$onInit()` manually.
			// (Bindings will always be pre-assigned in these versions.)
			if (angular.version.major === 1 && angular.version.minor < 5) {
				ctrl.$onInit();
			}

		}],
		link: function(scope, ele, attrs) {
			var ctrl = scope.ctrl;
			if (ctrl.formStatus) {
				ctrl.formStatus.form = ctrl.form;
			}

			scope.$on('mwForm.pageEvents.changePage', function(event, data) {
				if (typeof data.page !== "undefined" && data.page < ctrl.formData.pages.length) {
					ctrl.resetPages();
					for (var i = 0; i < data.page; i++) {
						ctrl.prevPages.push(ctrl.formData.pages[i]);
					}
					var currenPge = ctrl.formData.pages[data.page];
					ctrl.setCurrentPage(currenPge);
					$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
						currentPage: currenPge
					});
					ctrl.updateNextPageBasedOnAllAnswers();
				}
			});


		}
	};
}]);
angular.module('mwFormViewer').factory("FormQuestionId", function() {
        var id = 0;
        return {
            next: function() {
                return ++id;
            }
        }
    });

    angular.module('mwFormViewer').directive('mwFormQuestion', ['$parse','$rootScope', function($parse, $rootScope) {

        return {
            replace: true,
            restrict: 'AE',
            require: '^mwFormViewer',
            scope: {
                question: '=',
                questionResponse: '=',
                readOnly: '=?',
                options: '=?',
            onResponseChanged: '&?'
            },
            templateUrl: 'mw-form-question.html',
            controllerAs: 'ctrl',
            bindToController: true,
            controller: ["$timeout", "FormQuestionId", function($timeout, FormQuestionId) {
                var ctrl = this;
                ctrl.largeFileFlag = false;
                ctrl.fileSelectedEvent = false;
                // Put initialization logic inside `$onInit()`
                // to make sure bindings have been initialized.

                ctrl.functionclick = function()
                {
                    document.getElementById('inputFile').click();
                }
                this.$onInit = function() {
                    ctrl.id = FormQuestionId.next();

                    if (ctrl.question.type == 'radio') {
                        /*if (!ctrl.questionResponse.selectedAnswer) {
                            ctrl.questionResponse.selectedAnswer = null;
                        }*/
                        if (ctrl.questionResponse.other) {
                            ctrl.isOtherAnswer = true;
                        }

                    } else if (ctrl.question.type == 'checkbox') {
                        if (ctrl.questionResponse.selectedAnswers && ctrl.questionResponse.selectedAnswers.length) {
                            ctrl.selectedAnswer = true;
                        } else {
                            ctrl.questionResponse.selectedAnswers = [];
                        }
                        if (ctrl.questionResponse.other) {
                            ctrl.isOtherAnswer = true;
                        }


                    } else if (ctrl.question.type == 'grid') {
                        if (!ctrl.question.grid.cellInputType) {
                            ctrl.question.grid.cellInputType = "radio";
                        }
                        //if(ctrl.questionResponse.selectedAnswers){
                        //
                        //}else{
                        //    ctrl.questionResponse.selectedAnswers={};
                        //}
                    } else if (ctrl.question.type == 'division') {

                        ctrl.computeDivisionSum = function() {
                            ctrl.divisionSum = 0;
                            ctrl.question.divisionList.forEach(function(item) {

                                if (ctrl.questionResponse[item.id] != 0 && !ctrl.questionResponse[item.id]) {
                                    ctrl.questionResponse[item.id] = null;
                                    ctrl.divisionSum += 0;
                                } else {
                                    ctrl.divisionSum += ctrl.questionResponse[item.id];
                                }
                            });
                        };

                        ctrl.computeDivisionSum();


                    } else if (ctrl.question.type == 'date' || ctrl.question.type == 'datetime' || ctrl.question.type == 'time') {
                        if (ctrl.questionResponse.answer) {
                            ctrl.questionResponse.answer = new Date(ctrl.questionResponse.answer)
                        }
                    } else if (ctrl.question.type == 'file') {
                        ctrl.questionResponse.fileName = ctrl.questionResponse.fileName_1;
                        ctrl.questionResponse.answer = ctrl.questionResponse.answer;
                    }

                    ctrl.isAnswerSelected = false;
                    ctrl.initialized = true;
                };

                ctrl.selectedAnswerChanged = function() {
                    delete ctrl.questionResponse.other;
                    ctrl.isOtherAnswer = false;
                    ctrl.answerChanged();

                };
                ctrl.otherAnswerRadioChanged = function() {
                    if (ctrl.isOtherAnswer) {
                        ctrl.questionResponse.selectedAnswer = null;
                    }
                    ctrl.answerChanged();
                };

                ctrl.otherAnswerCheckboxChanged = function() {
                    if (!ctrl.isOtherAnswer) {
                        delete ctrl.questionResponse.other;
                    }
                    ctrl.selectedAnswer = ctrl.questionResponse.selectedAnswers.length || ctrl.isOtherAnswer ? true : null;
                    ctrl.answerChanged();
                };


                ctrl.toggleSelectedAnswer = function(answer) {
                    if (ctrl.questionResponse.selectedAnswers.indexOf(answer.id) === -1) {
                        ctrl.questionResponse.selectedAnswers.push(answer.id);
                    } else {
                        ctrl.questionResponse.selectedAnswers.splice(ctrl.questionResponse.selectedAnswers.indexOf(answer.id), 1);
                    }
                    ctrl.selectedAnswer = ctrl.questionResponse.selectedAnswers.length || ctrl.isOtherAnswer ? true : null;

                    ctrl.answerChanged();
                };

                ctrl.answerChanged = function() {
                    if (ctrl.onResponseChanged) {
                        ctrl.onResponseChanged();
                    }
                }

                // Prior to v1.5, we need to call `$onInit()` manually.
                // (Bindings will always be pre-assigned in these versions.)
                if (angular.version.major === 1 && angular.version.minor < 5) {
                    this.$onInit();
                }

            }],
            link: function(scope, ele, attrs, mwFormViewer) {
                var ctrl = scope.ctrl;
                ctrl.print = mwFormViewer.print;

                //file uploads

                ele.bind("change", function(changeEvent) {
                    var fileSize = changeEvent.target.files[0].size / 1024;
                    console.log("file size.....................",fileSize);
                    if (fileSize <= 1024) {
                        ctrl.largeFileFlag = false;
                        ctrl.fileSelectedEvent = true;
                        $rootScope.$broadcast('fileRequiredFlag', ctrl.largeFileFlag);
                        var reader = new FileReader();
                        var fileName = changeEvent.target.files[0];
                        reader.onload = function(loadEvent) {
                            scope.$apply(function() {
                                ctrl.questionResponse.answer = loadEvent.target.result;
                                ctrl.questionResponse.fileName = changeEvent.target.files[0].name;
                                ctrl.questionResponse.fileName_1 = changeEvent.target.files[0].name;
                            });
                        }
                        
                        reader.readAsDataURL(changeEvent.target.files[0]); 
                    } else {
                        scope.$apply(function() {
                            ctrl.largeFileFlag = true; 
                        });
                        $rootScope.$broadcast('fileRequiredFlag', ctrl.largeFileFlag);
                        alert("File size is larze; maximum file size 1 MB");           
                    }
                });
            }
        };
    }]);

angular.module('mwFormViewer')
    .directive('mwFormConfirmationPage', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormViewer',
        scope: {
            submitStatus: '=',
            confirmationMessage: '=',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-confirmation-page.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: function(){
            var ctrl = this;


        },
        link: function (scope, ele, attrs, mwFormViewer){
            var ctrl = scope.ctrl;
            ctrl.print =  mwFormViewer.print;
        }
    };
});
