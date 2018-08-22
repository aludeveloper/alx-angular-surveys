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

            ctrl.imageClick = function() {
                document.getElementById('imageName').click();
            }

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
