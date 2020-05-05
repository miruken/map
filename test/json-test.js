import {
    Base, Enum, design, createKeyChain 
} from "miruken-core";

import { Context } from "miruken-context";
import { root, ignore } from "../src/map-metadata";
import { JsonFormat, JsonMapping } from "../src/json-mapping";
import { mapsFrom, mapsTo, format } from "../src/maps";
import { expect } from "chai";

const _ = createKeyChain();

const Color = Enum({red: 1, blue: 2, green: 3});

const Person = Base.extend({
    $type:    "Person",
    firstName: undefined,
    lastName:  undefined,
    age:       undefined,
    @ignore
    password:  undefined,
    @design(Color)
    eyeColor:  undefined,
    get hobbies() { return _(this).hobbies; },
    set hobbies(value) { _(this).hobbies = value; }
});

const Doctor = Person.extend({
    $type: "Doctor",
    @design(Person)
    nurse: undefined,
    @design([Person])
    patients: undefined    
});

const PersonWrapper = Base.extend({
    @root                
    @design(Person)
    person: undefined
});

describe("JsonMapping", () => {
    let context;
    beforeEach(() => {
        context = new Context();
        context.addHandlers(new JsonMapping());
    });
    
    describe("#mapTo", () => {
        it("should map from json", () => {
            const person = context.mapTo({
                firstName:  "David",
                lastName:   "Beckham",
                eyeColor:   2,
                occupation: "soccer"
            }, JsonFormat, Person);
            expect(person).to.be.instanceOf(Person);
            expect(person.firstName).to.equal("David");
            expect(person.lastName).to.equal("Beckham");
            expect(person.eyeColor).to.equal(Color.blue);
            expect(person.occupation).to.be.undefined;
        });

        it("should ignore from json", () => {
            const person = context.mapTo({
                password: "1234"
            }, JsonFormat, Person);
            expect(person).to.be.instanceOf(Person);
            expect(person.password).to.be.undefined;
        });
        
        it("should pass through primitives", () => {
            expect(context.mapTo(1, JsonFormat)).to.equal(1);
            expect(context.mapTo(2, JsonFormat)).to.equal(2);
            expect(context.mapTo(true, JsonFormat)).to.equal(true); 
            expect(context.mapTo(false, JsonFormat)).to.equal(false);           
            expect(context.mapTo("hello", JsonFormat)).to.equal("hello");
            expect(context.mapTo("goodbye", JsonFormat)).to.equal("goodbye");
        });

        it("should map enum value", () => {
            expect(context.mapTo(1, JsonFormat, Color)).to.equal(Color.red);
            expect(context.mapTo(2, JsonFormat, Color)).to.equal(Color.blue);
            expect(context.mapTo(3, JsonFormat, Color)).to.equal(Color.green);
            expect(() => {
                expect(context.mapTo(4, JsonFormat, Color)).to.equal(Color.green);                            
            }).to.throw(TypeError, "4 is not a valid value for this Enum");
        });
        
        it("should map all from json", () => {
            const person = context.mapTo({
                firstName:  "David",
                lastName:   "Beckham",
                occupation: "soccer"
            }, JsonFormat, Person, { dynamic: true });
            expect(person).to.be.instanceOf(Person);
            expect(person.firstName).to.equal("David");
            expect(person.lastName).to.equal("Beckham");
            expect(person.occupation).to.equal("soccer");
        });

        it("should map all related from json", () => {
            const doctor = context.mapTo({
                firstName: "Mitchell",
                lastName:  "Moskowitz",
                hobbies:   ["golf", "cooking", "reading"],
                nurse: {
                    firstName:  "Clara",
                    lastName:   "Barton",
                    age:         36
                },                
                patients: [{
                    firstName:  "Lionel",
                    lastName:   "Messi",
                    occupation: "soccer",
                    age:         24
                }]
            }, JsonFormat, Doctor, { dynamic: true });
            expect(doctor).to.be.instanceOf(Doctor);
            expect(doctor.firstName).to.equal("Mitchell");
            expect(doctor.lastName).to.equal("Moskowitz");
            expect(doctor.hobbies).to.eql(["golf", "cooking", "reading"]);
            expect(doctor.nurse).to.be.instanceOf(Person);
            expect(doctor.nurse.firstName).to.equal("Clara");
            expect(doctor.nurse.lastName).to.equal("Barton");
            expect(doctor.nurse.age).to.equal(36);
            expect(doctor.patients[0]).to.be.instanceOf(Person);
            expect(doctor.patients[0].firstName).to.equal("Lionel");
            expect(doctor.patients[0].lastName).to.equal("Messi");
            expect(doctor.patients[0].age).to.equal(24);
        });

        it("should map all related from json ignoring case", () => {
            const doctor = context.mapTo({
                FirstNAME: "Mitchell",
                LASTName:  "Moskowitz",
                nurse: {
                    FIRSTName:  "Clara",
                    lastNAME:   "Barton"
                }
            }, JsonFormat, Doctor);
            expect(doctor).to.be.instanceOf(Doctor);
            expect(doctor.nurse).to.be.instanceOf(Person);
            expect(doctor.firstName).to.equal("Mitchell");
            expect(doctor.lastName).to.equal("Moskowitz");            
            expect(doctor.nurse.firstName).to.equal("Clara");
            expect(doctor.nurse.lastName).to.equal("Barton");
        });

        it("should map arrays", () => {
            const people = context.mapTo([{
                     firstName:  "David",
                     lastName:   "Beckham",
                     occupation: "soccer"
                  }], JsonFormat, [Person], { dynamic: true }),
                  person = people[0];
            expect(person).to.be.instanceOf(Person);
            expect(person.firstName).to.equal("David");
            expect(person.lastName).to.equal("Beckham");
            expect(person.occupation).to.equal("soccer");
        });

        it("should infer arrays", () => {
            const people = context.mapTo([{
                     firstName:  "David",
                     lastName:   "Beckham",
                     occupation: "soccer"
                  }], JsonFormat, Person, { dynamic: true }),
                  person = people[0];
            expect(person).to.be.instanceOf(Person);
            expect(person.firstName).to.equal("David");
            expect(person.lastName).to.equal("Beckham");
            expect(person.occupation).to.equal("soccer");
        });
        
        it("should map rooted json", () => {
            const wrapper = context.mapTo({
                    firstName:  "David",
                    lastName:   "Beckham",
                    occupation: "soccer"
                  }, JsonFormat, PersonWrapper, { dynamic: true }),
                  person = wrapper.person;
            expect(person).to.be.instanceOf(Person);
            expect(person.firstName).to.equal("David");
            expect(person.lastName).to.equal("Beckham");
            expect(person.occupation).to.equal("soccer");            
        });

        /*
        it("should override mapping", () => {
            const override = context.decorate({
                                 @mapsTo(Date)
                                 @format(JsonFormat)
                                 mapDateFromJson(mapTo) {
                                     return new Date(mapTo.value);
                                 }
                             }),
                  date = Mapping(override).mapTo(1481349600000, JsonFormat, Date);
            expect(date).to.be.instanceOf(Date);
            expect(+date).to.equal(+(new Date(2016,11,10)));
        });
        */
    });

    describe("#mapFrom", () => {
        it("should ignore symbols", () => {
            expect(context.mapFrom(Symbol(), JsonFormat)).to.be.undefined;
        });

        it("should ignore functions", () => {
            expect(context.mapFrom(function () {}, JsonFormat)).to.be.undefined;
        });
        
        it("should pass through primitives", () => {
            expect(context.mapFrom(1, JsonFormat)).to.equal(1);
            expect(context.mapFrom(new Number(2), JsonFormat)).to.equal(2);
            expect(context.mapFrom(true, JsonFormat)).to.equal(true); 
            expect(context.mapFrom(new Boolean(false), JsonFormat)).to.equal(false);           
            expect(context.mapFrom("hello", JsonFormat)).to.equal("hello");
            expect(context.mapFrom(String("goodbye"), JsonFormat)).to.equal("goodbye");
            // expect(context.mapFrom(new Date(2016,11,6), JsonFormat)).to.equal("2016-12-06T06:00:00.000Z");
            expect(context.mapFrom(/abc/, JsonFormat)).to.eql("/abc/");
        });

        it("should map to enum value", () => {
            expect(context.mapFrom(Color.red, JsonFormat)).to.equal(1);
            expect(context.mapFrom(Color.blue, JsonFormat)).to.equal(2);
            expect(context.mapFrom(Color.green, JsonFormat)).to.equal(3);
        });
        
        it("should map arrays of primitives", () => {
            expect(context.mapFrom([1,2,3], JsonFormat)).to.eql([1,2,3]);
            expect(context.mapFrom([false,true], JsonFormat)).to.eql([false,true]);
            expect(context.mapFrom(["one","two"], JsonFormat)).to.eql(["one","two"]);
            // expect(context.mapFrom([new Date(2016,11,6)], JsonFormat)).to.eql(["2016-12-06T06:00:00.000Z"]);
            expect(context.mapFrom([/abc/], JsonFormat)).to.eql(["/abc/"]);
        });
        
        it("should map all properties", () => {
            const person = new Person({
                      firstName: "Christiano",
                      lastName:  "Ronaldo",
                      age:       23,
                      eyeColor:  Color.blue
                  }),
                  json = context.mapFrom(person, JsonFormat);
            expect(json).to.eql({
                $type:     "Person",
                firstName: "Christiano",
                lastName:  "Ronaldo",
                age:       23,
                eyeColor:  2
            });
        });

        it("should ignore some properties", () => {
            const person    = new Person();
            person.password = "1234";
            const json      = context.mapFrom(person, JsonFormat);
            expect(json).to.eql({$type: "Person"});
        });
        
        it("should map specific properties", () => {
            const person = new Person({
                      firstName: "Christiano",
                      lastName:  "Ronaldo",
                      age:       23
                  }),
                  json = context.mapFrom(person, JsonFormat, { spec: {lastName: true} });
            expect(json).to.eql({
                lastName: "Ronaldo"
            });
        });
        
        it("should map nested properties", () => {
            const doctor = new Doctor({
                      firstName: "Mitchell",
                      lastName:  "Moskowitz",
                      nurse: new Person({
                          firstName: "Clara",
                          lastName:  "Barton",
                          age:       36
                      }),
                      patients: [
                          new Person({
                              firstName: "Lionel",
                              lastName:  "Messi",
                              age:       24
                          })
                      ]
                  });
            const json = context.mapFrom(doctor, JsonFormat);
            expect(json).to.eql({
                $type:     "Doctor",
                firstName: "Mitchell",
                lastName:  "Moskowitz",
                nurse: {
                    $type:     "Person",
                    firstName: "Clara",
                    lastName:  "Barton",
                    age:       36
                },
                patients: [{
                    $type:     "Person",
                    firstName: "Lionel",
                    lastName:  "Messi",
                    age:       24
                }]
            });
        });

        it("should map specific nested properties", () => {
            const doctor = new Doctor({
                      firstName: "Mitchell",
                      lastName:  "Moskowitz",
                      nurse: new Person({
                          firstName: "Clara",
                          lastName:  "Barton",
                          age:       36
                      }),
                      patients: [
                          new Person({
                              firstName: "Lionel",
                              lastName:  "Messi",
                              age:       24
                          })
                      ]
                  });            
            const json = context.mapFrom(doctor, JsonFormat, { spec: {
                nurse: {
                    lastName: true,
                    age:      true
                },
                patients: {
                    firstName: true
                }}
            });
            expect(json).to.eql({
                nurse: {
                    lastName:  "Barton",
                    age:       36
                },
                patients: [{
                    firstName: "Lionel",
                }]
            });
        });

        it("should map rooted properties", () => {
            const wrapper = new PersonWrapper({
                      firstName: "Franck",
                      lastName:  "Ribery",
                      age:       32
                  }),
                  json = context.mapFrom(wrapper, JsonFormat);
            expect(json).to.eql({
                firstName: "Franck",
                lastName:  "Ribery",
                age:       32
            });
        });

        it("should map specific rooted properties", () => {
            const wrapper = new PersonWrapper({
                      person: new Person({
                          firstName: "Franck",
                          lastName:  "Ribery",
                          age:       32
                      })
                  }),
                  json = context.mapFrom(wrapper, JsonFormat, {
                      spec: { person: { age: true } }
                  });
            expect(json).to.eql({
                age: 32
            });
        });

        it("should map arrays", () => {
            const wrappers = [new PersonWrapper({
                      firstName: "Franck",
                      lastName:  "Ribery",
                      age:       32
                  })],
                  json = context.mapFrom(wrappers, JsonFormat);
            expect(json).to.eql([{
                firstName: "Franck",
                lastName:  "Ribery",
                age:       32
            }]);
        });

        /*
        it("should override mapping", () => {
            const override = Mapping(context.decorate({
                                 @mapFrom(Date)
                                 @format(JsonFormat)
                                 mapDateToJson(mapFrom) {
                                     return +mapFrom.object;
                                 }
                             })),
                  json = override.mapFrom(new Date(2016,11,10), JsonFormat);
            expect(json).to.equal(1481349600000);
        });
        */        
    });
});
