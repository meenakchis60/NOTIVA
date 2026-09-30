const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Semester = require('./models/Semester');
const Subject = require('./models/Subject');
const Notebook = require('./models/Notebook');
const Note = require('./models/Note');
const Group = require('./models/Group');
const StudySession = require('./models/StudySession');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notiva';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Semester.deleteMany({});
    await Subject.deleteMany({});
    await Notebook.deleteMany({});
    await Note.deleteMany({});
    await Group.deleteMany({});
    await StudySession.deleteMany({});

    // 1. Create Primary User
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const user = new User({
      email: 'meenakchisridhar06@gmail.com',
      password: hashedPassword,
      firstName: 'Meenakchi',
      lastName: 'S'
    });
    await user.save();
    console.log('Created User:', user.email);

    // 2. Create Semesters
    const sem5 = new Semester({ name: 'Semester 5', user: user._id });
    const sem6 = new Semester({ name: 'Semester 6', user: user._id });
    await sem5.save();
    await sem6.save();
    console.log('Created Semesters');

    // 3. Create Subjects
    const subBigData = new Subject({ name: 'Big Data Analysis', semester: sem5._id, user: user._id });
    const subCloud = new Subject({ name: 'Cloud Computing', semester: sem5._id, user: user._id });
    const subWeb = new Subject({ name: 'Web Technologies', semester: sem5._id, user: user._id });
    const subML = new Subject({ name: 'Machine Learning', semester: sem6._id, user: user._id });
    await subBigData.save();
    await subCloud.save();
    await subWeb.save();
    await subML.save();
    console.log('Created Subjects');

    // 4. Create Notebooks
    const nbHadoop = new Notebook({ name: 'Unit 1: Hadoop Architecture', subject: subBigData._id, user: user._id });
    const nbMapReduce = new Notebook({ name: 'Unit 2: MapReduce & HDFS', subject: subBigData._id, user: user._id });
    const nbCloudArch = new Notebook({ name: 'Module 1: Virtualization & Cloud', subject: subCloud._id, user: user._id });
    const nbReactNode = new Notebook({ name: 'Unit 1: React & Node.js Architecture', subject: subWeb._id, user: user._id });
    await nbHadoop.save();
    await nbMapReduce.save();
    await nbCloudArch.save();
    await nbReactNode.save();
    console.log('Created Notebooks');

    // 5. Create Notes with detailed content and attached files
    const notesData = [
      {
        title: 'Introduction to Hadoop Distributed File System (HDFS)',
        content: `Hadoop Distributed File System (HDFS)

HDFS is the primary distributed storage system used by Hadoop applications to reliably store large datasets across clusters of commodity hardware.

1. NameNode (Master Node):
   - Manages the entire file system namespace and hierarchical directory tree.
   - Regulates client access to files and maintains metadata in 'fsimage' and 'edits' log.
   - Tracks the mapping of data blocks to DataNodes across the entire cluster.

2. DataNode (Worker Node):
   - Stores and retrieves data blocks upon instruction from clients or the NameNode.
   - Configured with default 128 MB block size (optimized for high-throughput streaming access).
   - Periodically sends Heartbeats and Block Reports to verify cluster health.

3. Secondary NameNode:
   - Helper daemon that periodically merges edit logs with fsimage to prevent unbounded log growth.
   - Performs periodic checkpoints of the namespace image.

Block Replication & Fault Tolerance:
- Default replication factor is 3 across cluster nodes.
- Rack Awareness places 2 replicas on the local rack and 1 replica on a remote rack.
- Ensures zero data loss even during complete switch or rack failure.

Common CLI Commands:
- hdfs dfs -ls /user/hadoop/data
- hdfs dfs -put local_dataset.csv /user/hadoop/data/
- hdfs fsck / -files -blocks -locations`,
        notebook: nbHadoop._id,
        user: user._id,
        is_pinned: true,
        is_starred: true,
        is_study_material: true,
        difficulty: 'INTERMEDIATE',
        attachments: [
          {
            name: 'HDFS_Architecture_Whitepaper_v3.pdf',
            file_type: 'pdf',
            file_size: '2.4 MB',
            url: '#'
          },
          {
            name: 'hdfs-site-cluster-configuration.xml',
            file_type: 'json',
            file_size: '45 KB',
            url: '#'
          }
        ]
      },
      {
        title: 'MapReduce Programming Paradigm & Hands-on Examples',
        content: `MapReduce Distributed Programming Paradigm

MapReduce is a software framework for easily writing applications that process vast amounts of unstructured and structured data in parallel on large clusters.

Execution Phases:
1. Input Splitting: Splits dataset into fixed 128 MB logical chunks for parallel workers.
2. Map Phase: User-defined mapper transforms raw key/value pairs into intermediate key/value pairs.
3. Shuffle & Sort: Framework sorts intermediate outputs and routes values with the same key to identical reducers.
4. Reduce Phase: User-defined reducer aggregates intermediate values for each unique key.
5. Output Writing: Stores final aggregated results back into HDFS.

Word Count Example Pipeline:
- Mapper: (DocumentId, LineText) -> emit(Word, 1)
- Reducer: (Word, [1, 1, 1, ...]) -> emit(Word, TotalCount)

Performance Optimizations:
- Combiner: Local mini-reducer run on mapper output to drastically cut network shuffle traffic.
- Custom Partitioner: Distributes keys evenly across reducers to eliminate data skew.`,
        notebook: nbMapReduce._id,
        user: user._id,
        is_pinned: false,
        is_starred: true,
        is_study_material: true,
        difficulty: 'ADVANCED',
        attachments: [
          {
            name: 'wordcount_mapper_and_reducer.py',
            file_type: 'py',
            file_size: '14 KB',
            url: '#'
          },
          {
            name: 'MapReduce_Execution_Flowchart.pdf',
            file_type: 'pdf',
            file_size: '1.8 MB',
            url: '#'
          },
          {
            name: 'sample_bigdata_corpus.csv',
            file_type: 'csv',
            file_size: '3.5 MB',
            url: '#'
          }
        ]
      },
      {
        title: 'Cloud Computing: IaaS, PaaS, SaaS & AWS Architecture',
        content: `Cloud Computing Architecture & Service Models

Cloud computing provides on-demand access to virtualized computing resources, storage, and networking over the internet with pay-as-you-go pricing.

1. Infrastructure as a Service (IaaS):
   - Provides fundamental compute, networking, and raw storage capabilities.
   - User manages Operating System, patches, runtime, and application code.
   - Examples: AWS EC2, Google Compute Engine, Microsoft Azure VMs.

2. Platform as a Service (PaaS):
   - Cloud provider manages OS, runtime environment, and automatic scaling.
   - Developers focus exclusively on authoring and deploying business application logic.
   - Examples: AWS Elastic Beanstalk, Heroku, Google App Engine, Render.

3. Software as a Service (SaaS):
   - Fully managed end-user software accessible directly via web browsers.
   - Provider handles all maintenance, infrastructure, and feature updates.
   - Examples: Google Workspace, Microsoft 365, Slack, Salesforce.

AWS Cloud Scalability Best Practices:
- Decouple components using asynchronous queues (AWS SQS / SNS).
- Use Auto Scaling Groups (ASG) behind Application Load Balancers (ALB).
- Utilize Amazon S3 for durable object storage with 99.999999999% (11 9s) durability.`,
        notebook: nbCloudArch._id,
        user: user._id,
        is_pinned: false,
        is_starred: false,
        is_study_material: true,
        difficulty: 'BEGINNER',
        attachments: [
          {
            name: 'AWS_Cloud_Practitioner_Study_Guide.pdf',
            file_type: 'pdf',
            file_size: '4.1 MB',
            url: '#'
          },
          {
            name: 'Cloud_Cost_Optimization_Matrix.xlsx',
            file_type: 'docx',
            file_size: '180 KB',
            url: '#'
          }
        ]
      },
      {
        title: 'Full Stack MERN Architecture & REST API Design',
        content: `Full Stack MERN Architecture & REST API Design

The MERN architecture enables end-to-end JavaScript engineering spanning database to client interface.

Core Technology Stack:
- MongoDB: Flexible NoSQL document database utilizing JSON/BSON documents.
- Express.js: Fast, unopinionated minimalist HTTP server and routing framework for Node.js.
- React.js: Declarative, component-driven user interface library with state management.
- Node.js: High-performance, asynchronous event-driven JavaScript V8 runtime.

RESTful Design Standards:
- Stateless request processing with JWT Authorization headers (Bearer <token>).
- Standard HTTP verbs: GET (fetch), POST (create), PUT (replace), PATCH (update), DELETE (remove).
- Consistent JSON error response payloads with HTTP status codes (200, 201, 400, 401, 404, 500).

State Management & React Query:
- TanStack Query (React Query) handles cache invalidation and background synchronization.
- Eliminates manual loading spinners and stale data synchronization bugs.`,
        notebook: nbReactNode._id,
        user: user._id,
        is_pinned: true,
        is_starred: false,
        is_study_material: true,
        difficulty: 'INTERMEDIATE',
        attachments: [
          {
            name: 'MERN_FullStack_Starter_Template.zip',
            file_type: 'zip',
            file_size: '5.2 MB',
            url: '#'
          },
          {
            name: 'REST_API_Swagger_Specification.json',
            file_type: 'json',
            file_size: '65 KB',
            url: '#'
          }
        ]
      },
      {
        title: 'NoSQL vs Relational Databases (ACID vs BASE)',
        content: `Database Systems: SQL vs NoSQL (ACID vs BASE)

Understanding the fundamental trade-offs between relational database management systems (RDBMS) and non-relational document stores.

Relational Databases (SQL):
- Strict tabular schema with tables, rows, columns, and foreign keys.
- ACID Guarantees: Atomicity, Consistency, Isolation, Durability.
- Ideal for complex relational joins, financial ledgers, and strict data models.
- Scalability: Typically vertical scaling (adding CPU, RAM, and SSD storage).

Document Stores (MongoDB NoSQL):
- Dynamic schema with nested documents, arrays, and flexible fields.
- BASE Philosophy: Basically Available, Soft state, Eventual consistency.
- Ideal for high write throughput, rapid feature iteration, and big data catalogs.
- Scalability: Horizontal scaling out-of-the-box via Sharding and Replica Sets.

CAP Theorem Guarantees:
- In distributed network partitions, systems must choose between Consistency (CP) or Availability (AP).
- MongoDB operates as a CP system with primary-secondary replica elections.`,
        notebook: nbHadoop._id,
        user: user._id,
        is_pinned: false,
        is_starred: false,
        is_study_material: false,
        difficulty: 'BEGINNER',
        attachments: []
      },
      {
        title: 'Real-time Stream Processing with Apache Spark & Kafka',
        content: `Real-Time Big Data Streaming: Apache Kafka & Spark

Modern distributed data platforms ingest millions of events per second with sub-second processing latency.

Architecture Pipeline:
[IoT / Web Producers] -> [Apache Kafka Topics] -> [Apache Spark Streaming] -> [MongoDB / Dashboards]

Core Kafka Concepts:
- Topics & Partitions: Ordered, immutable record logs partitioned for horizontal throughput.
- Brokers: Clustered server nodes storing partition segments on disk.
- Consumer Groups: Distributed workers reading topic partitions in parallel with offset tracking.

Apache Spark Structured Streaming:
- Unifies batch and streaming processing models using Catalyst query optimizer.
- Exactly-once processing guarantees through write-ahead logs and state store checkpoints.
- Sliding window aggregations over event timestamps with watermark late-data handling.`,
        notebook: nbHadoop._id,
        user: user._id,
        is_pinned: false,
        is_starred: false,
        is_study_material: true,
        difficulty: 'ADVANCED',
        attachments: [
          {
            name: 'Kafka_Spark_Streaming_Pipeline.pdf',
            file_type: 'pdf',
            file_size: '3.1 MB',
            url: '#'
          },
          {
            name: 'spark_stream_consumer.py',
            file_type: 'py',
            file_size: '18 KB',
            url: '#'
          }
        ]
      }
    ];

    for (const n of notesData) {
      const note = new Note(n);
      await note.save();
    }
    console.log(`Created ${notesData.length} Notes`);

    // 6. Create Groups
    const grp1 = new Group({
      name: 'CS Final Year Exam Prep',
      description: 'Study group for Big Data, Cloud Computing, and Machine Learning subjects.',
      role: 'admin',
      members: [user._id]
    });
    const grp2 = new Group({
      name: 'Big Data & Cloud Architecture Circle',
      description: 'Collaborative notes and discussions for Hadoop and AWS architectures.',
      role: 'member',
      members: [user._id]
    });
    await grp1.save();
    await grp2.save();
    console.log('Created Study Groups');

    // 7. Create Study Sessions
    const s1 = new StudySession({
      user: user._id,
      note_title: 'Hadoop Distributed File System (HDFS)',
      duration_seconds: 2700,
      status: 'COMPLETED',
      started_at: new Date(Date.now() - 86400000)
    });
    const s2 = new StudySession({
      user: user._id,
      note_title: 'MapReduce Programming Paradigm',
      duration_seconds: 1800,
      status: 'COMPLETED',
      started_at: new Date(Date.now() - 43200000)
    });
    await s1.save();
    await s2.save();
    console.log('Created Study Sessions');

    console.log('==============================================');
    console.log('MONGODB NOTIVA DATABASE POPULATED SUCCESSFULLY!');
    console.log('User Account: meenakchisridhar06@gmail.com');
    console.log('Password:     Password123!');
    console.log('==============================================');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
