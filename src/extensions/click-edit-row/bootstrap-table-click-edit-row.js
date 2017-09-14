/**
 * @author horken wong <horken.wong@gmail.com>
 * @version: v1.0.0
 * https://github.com/horkenw/bootstrap-table
 * Click to edit row for bootstrap-table
 */
  
(function ($) {
    'use strict';

    // converter
    
    var editableConverter = {
      'input' : {
        transformToEditable : function (column, currentValue) {
          var div = $('<div data-field-name/>').data('field-name', column.field);
          div.append($('<div class="form-inline"><input type="text" value="'+currentValue+'" class="form-control"/></div>'));
          return div;
        },
        applyUpdatedData : function (column, $node, updateData) {
          var fieldName = $node.find('[data-field-name]').data('field-name'),
            fieldValue = $node.find('input').val();
          updateData[fieldName] = fieldValue;
        }
      },
      'select' : {
        transformToEditable : function (column, currentValue) {
          var div = $('<div class="form-inline" data-field-name='+column.field+'/>'),
                select = $('<select id="'+column.field+'" class="form-control" >'),
                options = $.selectArray[column.field];
              div.append(select);
              setSelectOptions(select, options, currentValue);
              
              return div;
              
              function setSelectOptions (node, options, selectedOption) { 
                  var $option = $('<option />');
                  if (options) {
                      $(options).each(function (i, v) {
                        if (v.idxNum === selectedOption) {
                          $option.clone().attr('selected', 'selected').text(v.optLibelle).val(v.optValue).appendTo(node);
                        } else {
                          $option.clone().text(v.optLibelle).val(v.optValue).appendTo(node);
                        }
                      });
                  } else {
                      console.log('Please setup options first!!')
                  }
              }
        },
        applyUpdatedData : function (column, $node, updateData) {
          var fieldName = $node.find('[data-field-name]').data('field-name'),
            fieldValue = $node.find('select').val();
          updateData[fieldName] = fieldValue;
        }
      }
    }
    
    $.extend($.fn.bootstrapTable.defaults, {
      // disable plugin by default
        clickEdit: false,
        // return a promise is possible, if succeed => don't care of the result, if fail => expect "error string message"
        updateServerSide: function(uniqueId, trIdx, updatedData) {return true;},
        // return a promise is possible, if succeed => return the createData which will be insert on table, if fail => expect "error string message"
        createServerSide: function(createData) {return createData;},
        // mapping of converter by editable type
        editableConverter: editableConverter,
        // how to create mode
        choseEditableMode: function (table) {
          switch (table.options.editableMode) {
            case 'modal-mode':
            return new ModalMode(table);
            case 'inline-mode':
          return new InlineMode(table);
          // can add other mode
          }
        },
        // the chosen mode
        editableMode: 'inline-mode' // 'modal-mode' or 'inline-mode'
    });
    
    // tools 
    
    var removeByIndex = function (index) {
      // this = BootstrapTable
      var len = this.options.data.length;
      
      if (index > len) {
        return;
      }
      
    var row = this.options.data[index];
      this.options.data.splice(this.options.data.indexOf(row), 1);
    
    if (len === this.options.data.length) {
        return;
    }
    
    this.initSearch();
    this.initPagination();
    this.initBody(true);
    };
    
    // updatableMode
    
    var InlineMode = function (table) {
      var submit = '<button type="button" class="btn btn-primary btn-sm"><i class="glyphicon glyphicon-ok"></i></button>',
          cancel = '<button type="button" class="btn btn-default btn-sm"><i class="glyphicon glyphicon-remove"></i></button>',
          editableConverter = table.options.editableConverter;
      
      this.clickToEdit = function ($tr) {
        var trIdx = $tr.data().index,
          uniqueId = $tr.data().uniqueid;
  
          var replaceData = function () {
              var updateData = {};
              table.columns.forEach(function(column, i) {
                  if (!column.editable || !(column.editable in editableConverter)) return;
                  var $td = $tr.find('td').eq(column.fieldIndex);
                  editableConverter[column.editable].applyUpdatedData(column, $td, updateData);
              });
    
              // call updateServerSide which may return a promise
              $.when(table.options.updateServerSide(uniqueId, trIdx, updateData))
              .then(
                function () {
                  table.$el.bootstrapTable('updateRow', {
                        index: trIdx,
                        row: updateData
                    });
                    table.editing = true;
                },
                function (error) {
                  $tr.addClass('danger');
                    // remove old error
                  $tr.find('#editable-error').text('');
                  $tr.find('#editable-error').html('<div class="text-danger display-inline editable-error">'+error+'</div>');
                }
              );
              return false;
          };
  
          var recoveryData = function () {
            table.$el.bootstrapTable('updateRow', {
                  index: trIdx,
                  row: {}
              });
            table.editing = true;
            return false;
          };
  
          if (table.editing) {
              table.editing = false;
              table.columns.forEach(function(column, i) {
                  if (!column.editable || !(column.editable in editableConverter)) return;
                  var $td = $tr.find('td').eq(column.fieldIndex),
                    currentValue = $td.text();
                  $td.text('').html(editableConverter[column.editable].transformToEditable(column, currentValue));
              });
              var $lastTd = $tr.find('td > div').last(),
                lastHtml = $lastTd.html();
              $lastTd.html([
                '<table class="no-border">',
                  '<tr>',
                    '<td>',
                    lastHtml,
                    '</td>',
                    '<td>',
                    '<div id="editable-error" />',
                    '</td>',
                    '<td>',
                    '<div id="editable-tooling" class="editable-buttons pull-right" />',
                    '</td>',
                  '</tr>',
                '</table>',
              ].join(''));
              $(submit).on('click', replaceData).appendTo($tr.find('#editable-tooling'));
              $(cancel).on('click', recoveryData).appendTo($tr.find('#editable-tooling'));
          }
      };
      
      this.clickToCreate = function () {
        var trIdx = 0,
          $tr;
  
          var replaceData = function () {
              var createData = {};
              table.columns.forEach(function(column, i) {
                  if (!column.editable || !(column.editable in editableConverter)) return;
                  var $td = $tr.find('td').eq(column.fieldIndex);
                  editableConverter[column.editable].applyUpdatedData(column, $td, createData);
              });
    
              // call updateServerSide which may return a promise
              $.when(table.options.createServerSide(createData))
              .then(
                function (createdData) {
                  table.$el.bootstrapTable('updateRow', {
                        index: trIdx,
                        row: createdData
                    });
                    table.editing = true;
                },
                function (error) {
                  $tr.addClass('danger');
                    // remove old error
                  $tr.find('#editable-error').text('');
                  $tr.find('#editable-error').html('<div class="text-danger display-inline editable-error">'+error+'</div>');
                }
              );
              return false;
          };
    
          var recoveryData = function () {
            removeByIndex.apply(table, [trIdx]);
            table.editing = true;
            return false;
          };
    
          if (table.editing) {
              table.editing = false;
              
              table.$el.bootstrapTable('insertRow', {
                index: trIdx,
                row: {}
              });
              
              $tr = table.$el.find('tr[data-index="'+trIdx+'"]');
              
              table.columns.forEach(function(column, i) {
                  if (!column.editable || !(column.editable in editableConverter)) return;
                  var $td = $tr.find('td').eq(column.fieldIndex),
                    currentValue = $td.text();
                  $td.text('').html(editableConverter[column.editable].transformToEditable(column, currentValue));
              });
              var $lastTd = $tr.find('td > div').last(),
                lastHtml = $lastTd.html();
              $lastTd.html([
                '<table class="no-border">',
                  '<tr>',
                    '<td>',
                    lastHtml,
                    '</td>',
                    '<td>',
                    '<div id="editable-error" />',
                    '</td>',
                    '<td>',
                    '<div id="editable-tooling" class="editable-buttons pull-right" />',
                    '</td>',
                  '</tr>',
                '</table>',
              ].join(''));
              $(submit).on('click', replaceData).appendTo($tr.find('#editable-tooling'));
              $(cancel).on('click', recoveryData).appendTo($tr.find('#editable-tooling'));
          }
      };
    };
    
    var ModalMode = function (table) {
    var $modal = $([
          '<div class="editable-add modal fade" tabindex="-1" role="dialog">',
            '<div class="modal-dialog" role="document">',
              '<div class="modal-content">',
                '<div class="modal-header">',
                  '<h4 class="modal-title editable-tittle">Add row</h4>',
                '</div>',
                '<div class="modal-body">',
                '</div>',
                '<div class="modal-footer">',
                  '<button type="button" class="editable-cancel btn btn-default">Cancel</button>',
                  '<button type="button" class="editable-submit btn btn-primary">Create</button>',
                '</div>',
              '</div>',
            '</div>',
          '</div>'
        ].join('')),
        $cancel = $modal.find('button.editable-cancel'),
        $submit = $modal.find('button.editable-submit'),
        $tittleH4 = $modal.find('h4.editable-tittle'),
        $body = $modal.find('div.modal-body'),
        editableConverter = table.options.editableConverter;
    
    // init
    
      $modal.appendTo(table.$el);
      $modal.modal({
        backdrop: 'static',
        show: false
      });
    
    // methods
    
      this.clickToEdit = function ($tr) {
        $submit.text('Update');
        $tittleH4.text('Update row');
        $body.text('');
        var trIdx = $tr.data().index,
          uniqueId = $tr.data().uniqueid;
        
        $submit.on('click', submitAndUpdate);
          $cancel.on('click', function () {
            table.editing = true;
            $modal.modal('hide');
          });
          
          var $div = $modal.find('div.modal-body');
          table.columns.forEach(function(column, i) {
                var $internalDiv = $('<div data-editable-internal="'+column.field+'" class="form-group" />'),
            $td = $tr.find('td').eq(column.fieldIndex),
            currentValue = $td.text();
                $internalDiv.append($('<label>'+column.title+'</label>'));
                if (!column.editable || !(column.editable in editableConverter)) {
                  // readonly field
                  $internalDiv.append(currentValue);
                } else {
                  // updatable field
                  $internalDiv.append(editableConverter[column.editable].transformToEditable(column, currentValue));
                }
                $div.append($internalDiv);
            });
          
          $modal.modal('show');
          
          function submitAndUpdate () {
            // we get all data
            var updateData = table.$el.bootstrapTable('getRowByUniqueId', uniqueId);
            table.columns.forEach(function (column) {
                    if (!column.editable || !(column.editable in editableConverter)) return;
                    // we update only updatable field
              editableConverter[column.editable].applyUpdatedData(column, $modal.find('[data-editable-internal="'+column.field+'"]'), updateData);
            });
            $.when(table.options.updateServerSide(updateData))
            .then(
              function (updateData) {
                table.$el.bootstrapTable('updateByUniqueId', { id: uniqueId, row: updateData });
                table.editing = true;
                $modal.modal('hide');
              },
              function (error) {
                // delete old error
                $modal.find('.editable-danger').remove();
                $modal.find('.modal-body').prepend('<div class="editable-danger alert alert-danger"><p class="text-danger">'+error+'</p></div>');
              }
            );
          }
      };
      
      this.clickToCreate = function () {
        $submit.text('Create');
        $tittleH4.text('Create row');
        $body.text('');
        
        $submit.on('click', submitAndAdd);
          $cancel.on('click', function () {
            table.editing = true;
            $modal.modal('hide');
          });
          
          var $div = $modal.find('div.modal-body');
          table.columns.forEach(function(column, i) {
                if (!column.editable || !(column.editable in editableConverter)) return;
                var $internalDiv = $('<div data-editable-internal="'+column.field+'" class="form-group" />');
                $internalDiv.append($('<label>'+column.title+'</label>'));
                $internalDiv.append(editableConverter[column.editable].transformToEditable(column, ''));
                $div.append($internalDiv);
            });
          
          $modal.modal('show');
          
          function submitAndAdd () {
            var createData = {};
            table.columns.forEach(function (column) {
                    if (!column.editable || !(column.editable in editableConverter)) return;
              editableConverter[column.editable].applyUpdatedData(column, $modal.find('[data-editable-internal="'+column.field+'"]'), createData);
            });
            $.when(table.options.createServerSide(createData))
            .then(
              function (createdData) {
                table.$el.bootstrapTable('insertRow', { index: 0, row: createdData });
                table.editing = true;
                $modal.modal('hide');
              },
              function (error) {
                // delete old error
                $modal.find('.editable-danger').remove();
                $modal.find('.modal-body').prepend('<div class="editable-danger alert alert-danger"><p class="text-danger">'+error+'</p></div>');
              }
            );
          }
      };
      
    };
    
    var BootstrapTable = $.fn.bootstrapTable.Constructor,
        _initBody = BootstrapTable.prototype.initBody,
        _initToolbar = BootstrapTable.prototype.initToolbar;
  
    BootstrapTable.prototype.initBody = function () {
        _initBody.apply(this, Array.prototype.slice.apply(arguments));
  
        if (!this.options.clickEdit) {
            return;
        }
  
        var table = this.$tableBody.find('table'),
          clickToEdit = this.options.choseEditableMode(this).clickToEdit;
        
        table.on('click-row.bs.table', function (e, row, $element, field) {
            if (field === 'no') return;
            clickToEdit($element);
        });
    };
    
    BootstrapTable.prototype.initToolbar = function () {
      this.showToolbar = true;
      _initToolbar.apply(this, Array.prototype.slice.apply(arguments));
      
      if (!this.options.clickEdit) {
        return;
      }
      var $btnGroup = this.$toolbar.find('>.btn-group'),
        $editToolbar = $btnGroup.find('div.edit-toolbar');
      
      this.editing = true;

        if (!$editToolbar.length) {
            var clickToCreate = this.options.choseEditableMode(this).clickToCreate;
          var $button = $('<button class="btn btn-default" title="Add row" type="button"><i class="glyphicon glyphicon-plus"></i></button>');
          $button.on('click', clickToCreate);
          $editToolbar = $('<div class="edit-toolbar btn-group" />');
          $editToolbar.html($button);
          $editToolbar.appendTo($btnGroup);
        }
    };
    
})(jQuery);
