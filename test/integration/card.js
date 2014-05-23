module('Card Page', {
	setup: function() {
		Testing.setupMarketplace();
		Testing.createCard();
	},
	teardown: function() {
		Testing.restoreMethods(
			Balanced.Adapter.create
		);
	}
});

test('can view card page', function(assert) {
	visit(Testing.CARD_ROUTE)
		.then(function() {
			assert.equal($('#content h1').text().trim(), 'Card');
			assert.equal($(".title span").text().trim(), 'Test Card (3434)');
		});
});

test('debit card', function(assert) {
	var spy = sinon.spy(Balanced.Adapter, "create");

	visit(Testing.CARD_ROUTE)
		.then(function() {
			var controller = Balanced.__container__.lookup('controller:cards');
			var model = controller.get('model');
			model.set('customer', true);
			Ember.run.next(function() {
				click(".main-header .buttons a.debit-button")
					.then(function() {
						// opened the modal
						assert.equal(
							$('label.control-label:contains(characters max):visible').text(),
							'Appears on statement as (18 characters max)'
						);
						assert.equal(
							$('input[name="appears_on_statement_as"]:visible').attr('maxlength'),
							'18'
						);
					})
					.fillForm("#debit-funding-instrument", {
						dollar_amount: "1000",
						description: "Test debit"
					})
					.click('#debit-funding-instrument .modal-footer button[name="modal-submit"]')
					.then(function() {
						assert.ok(spy.calledOnce);
						assert.ok(spy.calledWith(Balanced.Debit, "/cards/" + Testing.CARD_ID + "/debits", sinon.match({
							amount: 100000,
							description: "Test debit"
						})));
					});
			});
		});
});

test('debiting only submits once despite multiple clicks', function(assert) {
	var stub = sinon.stub(Balanced.Adapter, "create");

	visit(Testing.CARD_ROUTE)
		.then(function() {
			var controller = Balanced.__container__.lookup('controller:cards');
			var model = controller.get('model');
			model.set('customer', true);
			Ember.run.next(function() {
				click(".main-header .buttons a.debit-button")
					.fillForm("#debit-funding-instrument", {
						dollar_amount: "1000",
						description: "Test debit"
					})
					.clickMultiple('#debit-funding-instrument .modal-footer button[name="modal-submit"]')
					.then(function() {
						assert.ok(stub.calledOnce);


					});
			});
		});
});

test('hold card', function(assert) {
	var spy = sinon.spy(Balanced.Adapter, "create");

	visit(Testing.CARD_ROUTE)
		.then(function() {
			var controller = Balanced.__container__.lookup('controller:cards');
			var model = controller.get('model');
			model.set('customer', true);
			Ember.run.next(function() {
				click(".main-header .buttons a.hold-button")
					.then(function() {
						assert.ok($('#hold-card').is(':visible'), 'Hold Card Modal Visible');
					})
					.fillForm("#hold-card", {
						dollar_amount: "1000",
						description: "Test Hold"
					})
					.click("#hold-card .modal-footer button[name=modal-submit]")
					.then(function() {
						var expectedAttributes = {
							amount: 100000,
							description: "Test Hold",
							source_uri: "/cards/" + Testing.CARD_ID
						};

						var args = spy.firstCall.args;
						assert.ok(spy.calledOnce, "Balanced.Adapter.create called");
						assert.equal(args[0], Balanced.Hold);
						assert.equal(args[1], "/cards/" + Testing.CARD_ID + "/card_holds");
						_.each(expectedAttributes, function(value, key) {
							assert.equal(args[2][key], value);
						});
					});
			});
		});
});

test('holding only submits once despite multiple clicks', function(assert) {
	var stub = sinon.stub(Balanced.Adapter, "create");

	visit(Testing.CARD_ROUTE)
		.then(function() {
			var controller = Balanced.__container__.lookup('controller:cards');
			var model = controller.get('model');
			model.set('customer', true);
			Ember.run.next(function() {
				click(".main-header .buttons a.hold-button")
					.fillForm("#hold-card", {
						dollar_amount: "1000",
						description: "Test debit"
					})
					.clickMultiple('#hold-card .modal-footer button[name=modal-submit]')
					.then(function() {
						assert.ok(stub.calledOnce);

						Balanced.Adapter.create.restore();
					});
			});
		});
});

test('renders metadata correctly', function(assert) {
	var metaData = {
		'key': 'value',
		'other-keey': 'other-vaalue'
	};
	Ember.run(function() {
		Balanced.Card.findAll().then(function(cards) {
			var card = cards.content[0];
			card.set('meta', metaData);

			card.save().then(function(card) {
				var cardPageUrl = Testing.CARD_ROUTE = '/marketplaces/' + Testing.MARKETPLACE_ID + '/cards/' + card.get('id');
				visit(cardPageUrl).then(function() {
					var $dl = $('.card-info .dl-horizontal');
					$.each(metaData, function(key, value) {
						assert.equal($dl.find('dt:contains(' + key + ')').length, 1);
						assert.equal($dl.find('dd:contains(' + value + ')').length, 1);
					});
				});
			});
		});
	});
});
