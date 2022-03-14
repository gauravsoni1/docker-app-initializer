#!/usr/bin/env node

const inquirer = require("inquirer");
const yaml = require("yaml");
const fs = require("fs");
const { exec } = require("child_process");

const constants = {
  KAKFA: "kakfa",
  REDIS: "redis",
};

const dockerComposeObj = {
  version: "2",
  services: {},
  volumes: {},
};

inquirer
  .prompt([
    {
      type: "checkbox",
      name: "applications",
      message: "Which all applications would you like to start ?",
      choices: [constants.REDIS, constants.KAKFA, "Elastic Search", "Kibana"],
    },
  ])
  .then((answers) => {
    console.info("Answer:", answers.applications);
    for (let i = 0; i < answers.applications.length; i++) {
      switch (answers.applications[i]) {
        case constants.REDIS:
          {
            dockerComposeObj.services["redis"] = {
              image: "docker.io/bitnami/redis:6.2",
              ports: ["6379:6379"],
              volumes: ["redis_data:/bitnami/redis/data"],
              environment: [
                "ALLOW_EMPTY_PASSWORD=yes",
                "REDIS_DISABLE_COMMANDS=FLUSHDB,FLUSHALL",
              ],
            };
            dockerComposeObj.volumes = Object.assign(dockerComposeObj.volumes, {
              redis_data: {
                driver: "local",
              },
            });
          }
          break;
        case constants.KAKFA:
          {
            dockerComposeObj.services["kafka"] = {
              image: "docker.io/bitnami/kafka:3",
              ports: ["9092:9092"],
              volumes: ["kafka_data:/bitnami"],
              environment: [
                "KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper:2181",
                "ALLOW_PLAINTEXT_LISTENER=yes",
                "KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:9092",
              ],
              depends_on: ["zookeeper"],
            };

            dockerComposeObj.services["zookeeper"] = {
              image: "docker.io/bitnami/zookeeper:3.7",
              ports: ["2181:2181"],
              volumes: ["zookeeper_data:/bitnami"],
              environment: ["ALLOW_ANONYMOUS_LOGIN=yes"],
            };

            dockerComposeObj.volumes = Object.assign(dockerComposeObj.volumes, {
              zookeeper_data: {
                driver: "local",
              },
              kafka_data: {
                driver: "local",
              },
            });
          }
          break;
      }
    }

    const doc = new yaml.Document();
    doc.contents = dockerComposeObj;
    executeDockerFile(doc);
  });

function executeDockerFile(doc) {
  console.log("Creating docker file");
  fs.writeFile("./docker-compose.yml", doc.toString(), (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Starting off docker containers .... ");
      exec("docker-compose up -d", (err, out, sderr) => {
        if (err) {
          console.log(err);
        }
        if (sderr) {
          console.log(sderr);
        }
        console.log("Applications started in docker container");
      });
    }
  });
}
