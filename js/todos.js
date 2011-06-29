// Med Jot was built on top of Jerome Gravel-Niquet's Todo demo
// It uses LocalStorage to persist data in your browser

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function(){

  // Todo Model
  // ----------

  // Our basic **Todo** model has `content`, `order`, and `done` attributes.
  window.Todo = Backbone.Model.extend({

    // Default attributes for the todo.
    defaults: {
      content: "empty todo...",
      done: false,
      location: "undefined",
      sublocation: "none"
    },

    // Ensure that each todo created has `content`.
    initialize: function() {
      if (!this.get("content")) {
        this.set({"content": this.defaults.content});
      }
    },


    // Toggle the `done` state of this todo item.
    toggle: function() {
      this.save({done: !this.get("done")});
    },


    // Remove this Todo from *localStorage* and delete its view.
    clear: function() {
      this.destroy();
      this.view.remove();
    }
  });


  // Todo Collection
  // ---------------

  // The collection of todos is backed by *localStorage* instead of a remote
  // server.
  window.TodoList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Todo,

    // Save all of the todo items under the `"todos"` namespace.
    localStorage: new Store("jot"),

    // Filter down the list of all todo items that are finished.

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(todo) {
      return todo.get('order');
    }

  });

  window.Todos = new TodoList;


  // history view
  //
  window.HistoryView = Backbone.View.extend({
    el:           $('.history-content'),
    tagName:  "div",
    template: _.template($('#history-template').html()),
    events:       {},

    
    initialize: function() {
      _.bindAll(this, 'render');
      this.render();
    },

    render: function() {
      $(this.el).html(this.template());
      return this;
    }
  });

  window.History = new HistoryView;
  
  // Review of systems View

  window.RosView = Backbone.View.extend({

    el:  $('.ros-container'),
    tagName:  "div",
    template: _.template($('#ros-section').html()),
    events:   {},

    initialize: function() {
      _.bindAll(this, 'render');
      this.render();
    },

    render: function() {
      $(this.el).html(this.template());
      return this;
    }
  });

  window.Ros = new RosView;

  // Todo Item View
  // --------------

  // The DOM element for a todo item...
  window.TodoView = Backbone.View.extend({

    //... is a list tag.
    tagName:  "li",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),


    // The DOM events specific to an item.
    events: {
      "click .check"              : "toggleDone",
      "dblclick div.todo-content" : "edit",
      "click .todo-move"          : "setLocation",
      "click span.tag"            : "setLocation",
      "click span.todo-destroy"   : "clear",
      "keypress .todo-input"      : "updateOnEnter"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Todo** and a **TodoView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render', 'close');
      this.model.bind('change', this.render);
      this.model.view = this;
    },

    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.setContent();
      return this;
    },

    // To avoid XSS (not that it would be harmful in this particular app),
    // we use `jQuery.text` to set the contents of the todo item.
    setContent: function() {
      var content = this.model.get('content');

      this.$('.todo-content').text(content);
      this.input = this.$('.todo-input');
      this.input.bind('blur', this.close);
      this.input.val(content);
    },

    // Set location attribute
    setLocation: function(e) {
      var location = $(e.target).text();
      this.model.set({location: location}).save();
    },

    // Toggle the `"done"` state of the model.
    toggleDone: function() {
      this.model.toggle();
    },

    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      $(this.el).addClass("editing");
      this.input.focus();
    },

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
      this.model.save({content: this.input.val()});
      $(this.el).removeClass("editing");
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // Remove this view from the DOM.
    remove: function() {
      $(this.el).remove();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }



  });

  // The Application
  // ---------------

  // Our overall **AppView** is the top-level piece of UI.
  window.AppView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#center-app"),

    // destination template
    //
    destinationTemplate: _.template($('#destination-template').html()),



    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "keyup #new-todo":     "checkText",
      "click span#help":     "showHelp",
      "click .tag" :         "setAutoTag",
    },

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {
      _.bindAll(this, 'addOne', 'addAll', 'render', 'setAutoTag', 'move', 'checkText', 'showROS', 'toggleDetails');

      this.input    = this.$("#new-todo");

      this.currentDestination  =  "JOT";
      this.currentROS = 0;

      Todos.bind('add',             this.addOne);
      Todos.bind('change:location', this.move);
      Todos.bind('reset',           this.addAll);
      Todos.bind('all',             this.render);


      Todos.fetch();
    },


    // Re-rendering the App just means refreshing the current auto-tag
    //
    render: function() {
      var current = this.currentDestination.toLowerCase() ;
      this.$('#current-destination').html(this.destinationTemplate());
      this.$('.auto-tag').children().removeClass('current-tag').filter('.' + current).addClass('current-tag');
      this.toggleDetails(current);
    },

    setAutoTag: function(e) {
      this.input.focus();
      this.currentDestination = $(e.target).text();
      this.render();
    },

    move: function(todo) {
      todo.view.remove();
      var view = new TodoView({model: todo});
      var location = todo.get('location').toLowerCase();
      $(".jot-list").filter('.'+location).append(view.render().el);

    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    //
    // Add the jot to the correct list
    //
    addOne: function(todo) {
      var view = new TodoView({model: todo});
      if (todo.get('content').length > 0) {
        var location = todo.get('location').toLowerCase();
        $(".jot-list").filter('.'+location).append(view.render().el);
      } else {
        todo.view.clear();
      }
    },

    // Add all items in the **Todos** collection at once.
    addAll: function() {
      Todos.each(this.addOne);
    },

    // Generate the attributes for a new Todo item.
    newAttributes: function() {
      return {
        content: this.input.val(),
        order:   Todos.nextOrder(),
        location: "none",
        done:    false
      };
    },

    // If you hit return in the main input field, create new **Todo** model,
    // persisting it to *localStorage*.
    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      var content = this.input.val();
      var attrs = this.newAttributes();
      attrs.content = content;
      attrs.location = this.currentDestination;

      Todos.create(attrs);
      this.input.val('');
    },

    // reshow help menu
    showHelp: function() {
      $("#guider_overlay").fadeIn("fast");
      $('.guider').fadeIn("fast");
    },


    // on keyup check input box for commands flags shortcuts
    checkText: function(e) {


      var val = this.input.val();
      
      // test for flags (.hpi, .ros, .pmh)

      if (/\.(pt|cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i.test(val)) {
        var flag = val.match(/\.(pt|cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i);
        this.currentDestination = flag[1].toUpperCase();
        val = val.replace(/\.(pt|cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i, "");
        this.input.val(val);
        this.render();
        //this.toggleDetails();
        
      };

      // ROS section controls
      // use '>' and '<' to cycle through sections (current + next 3)
      // set of keycodes ["A","D","S","F","J","K","L","E","W","C","M","P","G","H", "W", "B", "N", "P"]
      if (this.currentDestination == 'ROS') {
        // remove previous highlights

        this.$('.ros-state').removeClass('highlight-keycode');
        this.$('.ros-item').removeClass('last-ros');
        // cycle ROS
        var c = this.currentROS;
        if (/</.test(val)) { (c == 0) ? c = 0 : c -= 1 };
        if (/>/.test(val)) { (c > 13) ? c : c += 1 };
        this.currentROS = c;
        val = val.replace(/(<|>)/i, "");
        this.showROS();
        this.input.val(val);
        
        if ((/\w/i).test(val)) {
          //highlight section on first letter

          // get index to set showROS
          this.$('.'+ val.toUpperCase()).addClass('highlight-keycode');
          if ((/\w\w/i).test(val)) {

            val = val.toUpperCase();
            var rosItem = this.$('.' + val);
            var potentialROS = rosItem.parent().parent().parent().index();
            
            if (this.currentROS-1 <= potentialROS && potentialROS <= this.currentROS + 2) {
              // toggles yes/no/unasked
              if (rosItem.hasClass('ros-yes')) {
                rosItem.removeClass('ros-yes').filter('.ros-content').addClass('ros-no');
              } else if (rosItem.hasClass('ros-no')) {
                rosItem.removeClass('ros-no');
              } else {
                rosItem.filter('.icon').addClass('ros-yes');
              };

              this.currentROS = rosItem.parent().addClass('last-ros').parent().parent().index();
            };
                
            this.input.val('');
            //alert(i);
            //this.currentROS = index;
            this.showROS();
          };
        };



      };


    },

    // show active ROS sections (have too many sections to show all at once)
    showROS: function() {
      var sections = this.$('.ros-container').children().hide();
      var start = this.currentROS > 1 ? this.currentROS : 1;
      sections.slice(start-1,start+3).show().index();
    },

    // toggle details container below input for extras
    toggleDetails: function(current) {
      this.$('.details').hide();
      this.$('.' + current + '-container').show();
      this.showROS();
    }
  });





  // Finally, we kick things off by creating the **App**
  window.App = new AppView;


});


