// An example Backbone application contributed by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses a simple
// [LocalStorage adapter](backbone-localstorage.html)
// to persist Backbone models within your browser.

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
    },

    //  location methods


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
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

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

  // Create our global collection of **Todos**.
  window.Todos = new TodoList();

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
      "keyup #new-todo":     "showTooltip",
      "click span#help":         "showHelp",
    },

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {
      _.bindAll(this, 'addOne', 'addAll', 'render');

      this.input    = this.$("#new-todo");

      this.currentDestination  =  "undefined";
      this.singleDestination = "";

      Todos.bind('add',             this.addOne);
      Todos.bind('change:location', this.move);
      Todos.bind('reset',           this.addAll);
      Todos.bind('all',             this.render);
      

      Todos.fetch();
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      
      this.$('#current-destination').html(this.destinationTemplate({
        destination     : this.currentDestination
      }));

    },

    move: function(todo) {
      todo.view.remove();
      var view = new TodoView({model: todo});
      var location = todo.get('location').toLowerCase();
      $(".jot-list").filter('.'+location).append(view.render().el);

      //addOne(todo);
      //alert(todo.get('content')+ 'wants to move');
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

      // test for flags (.hpi, .ros, ..pmh)
      // single use flags use '.' -- permanent use '..'

      if (/\.+(cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i.test(content)) {
        var flag = content.match(/(\.+)(cc|hpi|pmh|psh|meds|all|sh|fh|ros|jot)/i);
        var location = flag[2].toUpperCase();
        var f = flag[1].length;
        var content = content.replace(/\.+(cc|hpi|pmh|psh|meds|sh|fh|ros|jot)/i, "");

      }
      
      if (location == 'JOT') { location = "undefined" };
      if (f == 2) { this.currentDestination = location };
      if (!f) { location = this.currentDestination };
      
      var attrs = this.newAttributes();
      attrs.content = content;
      attrs.location = location;

      Todos.create(attrs);
      this.input.val('');
    },
    
    // reshow help menu
    showHelp: function() {
      $("#guider_overlay").fadeIn("fast");
      $('.guider').fadeIn("fast");
    },
    

    // Lazily show the tooltip that tells you to press `enter` to save
    // a new todo item, after one second.
    showTooltip: function(e) {
      var tooltip = this.$(".ui-tooltip-top");
      var val = this.input.val();
      tooltip.fadeOut();
      if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
      if (val == '' || val == this.input.attr('placeholder')) return;
      var show = function(){ tooltip.show().fadeIn(); };
      this.tooltipTimeout = _.delay(show, 1000);
    }

  });





  // Finally, we kick things off by creating the **App**.
  window.App = new AppView;
});


