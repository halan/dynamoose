'use strict';


var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
dynamoose.local();

var Schema = dynamoose.Schema;

var should = require('should');


describe('Schema tests', function (){
  this.timeout(5000);

  it('Simple schema', function (done) {
    var schemaObj = {
     id: Number,
     name: String,
     children: [Number],
     aMap: {
        mapId: Number,
        mapName: String,
        anotherMap:{
          m1:String,
        }
     },
     aList:[
        {
          listMapId: Number,
          listMapName: String
        }
      ]
    };

    var schema = new Schema(schemaObj);

    schema.attributes.id.type.name.should.eql('number');
    should(schema.attributes.id.isSet).not.be.ok;
    should.not.exist(schema.attributes.id.default);
    should.not.exist(schema.attributes.id.validator);
    should(schema.attributes.id.required).not.be.ok;

    schema.attributes.name.type.name.should.eql('string');
    schema.attributes.name.isSet.should.not.be.ok;
    should.not.exist(schema.attributes.name.default);
    should.not.exist(schema.attributes.name.validator);
    should(schema.attributes.name.required).not.be.ok;

    schema.attributes.children.type.name.should.eql('number');
    schema.attributes.children.isSet.should.be.ok;
    should.not.exist(schema.attributes.children.default);
    should.not.exist(schema.attributes.children.validator);
    should(schema.attributes.children.required).not.be.ok;

    schema.attributes.aMap.type.name.should.eql('map');
    schema.attributes.aMap.attributes.mapId.type.name.should.eql('number');
    schema.attributes.aMap.attributes.mapName.type.name.should.eql('string');
    should.not.exist( schema.attributes.aMap.attributes.mapId.default);
    should.not.exist( schema.attributes.aMap.attributes.mapId.validator);
    should( schema.attributes.aMap.attributes.mapId.required).not.be.ok;
    schema.attributes.aMap.attributes.anotherMap.attributes.m1.type.name.should.eql('string');

    schema.attributes.aList.type.name.should.eql('list');
    schema.attributes.aList.attributes[0].attributes.listMapId.type.name.should.eql('number');
    schema.attributes.aList.attributes[0].attributes.listMapName.type.name.should.eql('string');

    schema.hashKey.should.equal(schema.attributes.id); // should be same object
    should.not.exist(schema.rangeKey);

    schema.throughput.read.should.equal(1);
    schema.throughput.write.should.equal(1);

    done();
  });

  it('Schema with basic options', function (done) {
    var schema = new Schema({
      id: {
        type: Number,
        validate: function(v) { return v > 0; },
        rangeKey: true
      },
      breed: {
        type: String,
        hashKey: true
      },
      name: {
        type: String,
        required: true
      },
      color: {
        type: String,
        default: 'Brown'
      },
      born: {
        type: Date,
        default: Date.now
      },
      aMap: {
        mapId: {type: Number, required:true },
        mapName: {type: String, required:true }
      },
      aList:[
        {
          listMapId: {type: Number, default: 1},
          listMapName: {type: String, default:"SomeName"}
        }
      ]
    }, {throughput: {read: 10, write: 2}});

    schema.attributes.id.type.name.should.eql('number');
    should(schema.attributes.id.isSet).not.be.ok;
    should.not.exist(schema.attributes.id.default);
    var validator = schema.attributes.id.validator;
    should.exist(validator);
    validator(-1).should.not.be.ok;
    validator(1).should.be.ok;
    should(schema.attributes.id.required).not.be.ok;

    schema.attributes.name.type.name.should.eql('string');
    schema.attributes.name.isSet.should.not.be.ok;
    should.not.exist(schema.attributes.name.default);
    should.not.exist(schema.attributes.name.validator);
    schema.attributes.name.required.should.be.ok;

    schema.attributes.color.type.name.should.eql('string');
    schema.attributes.color.isSet.should.not.be.ok;
    schema.attributes.color.default().should.eql('Brown');
    should.not.exist(schema.attributes.color.validator);
    should(schema.attributes.color.required).not.be.ok;

    schema.attributes.born.type.name.should.eql('date');
    schema.attributes.born.isSet.should.not.be.ok;
    schema.attributes.born.default().should.be.ok;
    should.not.exist(schema.attributes.born.validator);
    should(schema.attributes.born.required).not.be.ok;

    schema.attributes.aMap.attributes.mapId.type.name.should.eql('number');
    schema.attributes.aMap.attributes.mapId.required.should.be.ok;
    schema.attributes.aMap.attributes.mapName.type.name.should.eql('string');
    schema.attributes.aMap.attributes.mapName.required.should.be.ok;

    schema.attributes.aList.attributes[0].attributes.listMapId.type.name.should.eql('number');
    schema.attributes.aList.attributes[0].attributes.listMapId.default().should.be.ok;
    schema.attributes.aList.attributes[0].attributes.listMapName.type.name.should.eql('string');
    schema.attributes.aList.attributes[0].attributes.listMapName.default().should.be.ok;



    schema.hashKey.should.equal(schema.attributes.breed); // should be same object
    schema.rangeKey.should.equal(schema.attributes.id);

    schema.throughput.read.should.equal(10);
    schema.throughput.write.should.equal(2);

    done();
  });

  it('Schema with secondary indexes', function (done) {
    var schema = new Schema({
      ownerId: {
        type: Number,
        validate: function(v) { return v > 0; },
        hashKey: true
      },
      breed: {
        type: String,
        rangeKey: true,
        index: {
          global: true,
          rangeKey: 'color',
          name: 'IdGlobalIndex',
          project: true, // ProjectionType: ALL
          throughput: 5 // read and write are both 5
        }
      },
      name: {
        type: String,
        required: true,
        index: true // name: nameLocalIndex, ProjectionType: ALL
      },
      color: {
        type: String,
        default: 'Brown',
        index: [{ // name: colorLocalIndex
          project: ['name'] // ProjectionType: INCLUDE
        },{ // name: colorGlobalIndex, no ragne key
          global: true,
          project: ['name', 'breed'] // ProjectionType: INCLUDE
        }]
      },
      born: {
        type: Date,
        default: Date.now,
        index: {
          name: 'birthIndex',
          project: false // ProjectionType: KEYS_ONLY
        }
      }
    });

    schema.attributes.ownerId.type.name.should.eql('number');
    should(schema.attributes.ownerId.isSet).not.be.ok;
    should.not.exist(schema.attributes.ownerId.default);
    var validator = schema.attributes.ownerId.validator;
    should.exist(validator);
    validator(-1).should.not.be.ok;
    validator(1).should.be.ok;
    should(schema.attributes.ownerId.required).not.be.ok;

    var breed = schema.attributes.breed;
    breed.type.name.should.eql('string');
    breed.isSet.should.not.be.ok;
    should.not.exist(breed.default);
    should.not.exist(breed.validator);
    should(breed.required).not.be.ok;
    breed.indexes.should.have.property('IdGlobalIndex');
    breed.indexes.IdGlobalIndex.should.have.property('global', true);
    breed.indexes.IdGlobalIndex.should.have.property('project', true);
    breed.indexes.IdGlobalIndex.should.have.property('rangeKey', 'color');
    breed.indexes.IdGlobalIndex.should.have.property('throughput', {read: 5, write: 5});

    var name = schema.attributes.name;
    name.type.name.should.eql('string');
    name.isSet.should.not.be.ok;
    should.not.exist(name.default);
    should.not.exist(name.validator);
    name.required.should.be.ok;
    name.indexes.should.have.property('nameLocalIndex');
    name.indexes.nameLocalIndex.should.not.have.property('global');
    name.indexes.nameLocalIndex.should.have.property('project', true);
    name.indexes.nameLocalIndex.should.not.have.property('rangeKey');
    name.indexes.nameLocalIndex.should.not.have.property('throughput');


    var color = schema.attributes.color;
    color.type.name.should.eql('string');
    color.isSet.should.not.be.ok;
    color.default().should.eql('Brown');
    should.not.exist(color.validator);
    should(color.required).not.be.ok;
    color.indexes.should.have.property('colorLocalIndex');
    color.indexes.colorLocalIndex.should.not.have.property('global');
    color.indexes.colorLocalIndex.should.have.property('project', ['name']);
    color.indexes.colorLocalIndex.should.not.have.property('rangeKey');
    color.indexes.colorLocalIndex.should.not.have.property('throughput');
    color.indexes.should.have.property('colorGlobalIndex');
    color.indexes.colorGlobalIndex.should.have.property('global', true);
    color.indexes.colorGlobalIndex.should.have.property('project', ['name', 'breed'] );
    color.indexes.colorGlobalIndex.should.not.have.property('rangeKey');
    color.indexes.colorGlobalIndex.should.have.property('throughput', {read: 1, write: 1});

    var born = schema.attributes.born;
    born.type.name.should.eql('date');
    born.isSet.should.not.be.ok;
    born.default().should.be.ok;
    should.not.exist(born.validator);
    should(born.required).not.be.ok;
    born.indexes.should.have.property('birthIndex');
    born.indexes.birthIndex.should.not.have.property('global');
    born.indexes.birthIndex.should.have.property('project', false);
    born.indexes.birthIndex.should.not.have.property('rangeKey');
    born.indexes.birthIndex.should.not.have.property('throughput');


    schema.hashKey.should.equal(schema.attributes.ownerId); // should be same object
    schema.rangeKey.should.equal(schema.attributes.breed);

    schema.throughput.read.should.equal(1);
    schema.throughput.write.should.equal(1);

    done();
  });


});
