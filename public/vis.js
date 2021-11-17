/* global d3 */

d3.json("1k.json", (error, graph) => {
  console.log("graph", graph);
  const nodes = graph.nodes;
  const links = graph.links;

  const width = 9600;
  const height = 5000;

  // separation between same-color circles
  const padding = 9; // 1.5

  // separation between different-color circles
  const clusterPadding = 48; // 6

  const maxRadius = 12;

  const z = d3.scaleOrdinal(d3.schemeCategory20);

  // total number of nodes
  const n = nodes.length;
  console.log("no of nodes:", n);
  // detect communities with jsLouvain
  var nodeData = nodes.map(function (d) {
    return d.id;
  });
  var linkData = links.map(function (d) {
    return { source: d.source, target: d.target, weight: d.weight };
  });
  
  
  jLouvain = function () {
    //Constants
    var __PASS_MAX = -1;
    var __MIN = 0.0000001;

    //Local vars
    var original_graph_nodes;
    var original_graph_edges;
    var original_graph = {};
    var partition_init;

    //Helpers
    function make_set(array) {
      var set = {};
      array.forEach(function (d, i) {
        set[d] = true;
      });
      return Object.keys(set);
    }

    function obj_values(obj) {
      var vals = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          vals.push(obj[key]);
        }
      }
      return vals;
    }

    function get_degree_for_node(graph, node) {
      var neighbours = graph._assoc_mat[node]
        ? Object.keys(graph._assoc_mat[node])
        : [];
      var weight = 0;
      neighbours.forEach(function (neighbour, i) {
        var value = graph._assoc_mat[node][neighbour] || 1;
        if (node == neighbour) value *= 2;
        weight += value;
      });
      return weight;
    }

    function get_neighbours_of_node(graph, node) {
      if (typeof graph._assoc_mat[node] == "undefined") return [];

      var neighbours = Object.keys(graph._assoc_mat[node]);
      return neighbours;
    }

    function get_edge_weight(graph, node1, node2) {
      return graph._assoc_mat[node1]
        ? graph._assoc_mat[node1][node2]
        : undefined;
    }

    function get_graph_size(graph) {
      var size = 0;
      graph.edges.forEach(function (edge) {
        size += edge.weight;
      });
      return size;
    }

    function add_edge_to_graph(graph, edge) {
      update_assoc_mat(graph, edge);

      var edge_index = graph.edges
        .map(function (d) {
          return d.source + "_" + d.target;
        })
        .indexOf(edge.source + "_" + edge.target);

      if (edge_index != -1) graph.edges[edge_index].weight = edge.weight;
      else graph.edges.push(edge);
    }

    function make_assoc_mat(edge_list) {
      var mat = {};
      edge_list.forEach(function (edge, i) {
        mat[edge.source] = mat[edge.source] || {};
        mat[edge.source][edge.target] = edge.weight;
        mat[edge.target] = mat[edge.target] || {};
        mat[edge.target][edge.source] = edge.weight;
      });

      return mat;
    }

    function update_assoc_mat(graph, edge) {
      graph._assoc_mat[edge.source] = graph._assoc_mat[edge.source] || {};
      graph._assoc_mat[edge.source][edge.target] = edge.weight;
      graph._assoc_mat[edge.target] = graph._assoc_mat[edge.target] || {};
      graph._assoc_mat[edge.target][edge.source] = edge.weight;
    }

    function clone(obj) {
      if (obj == null || typeof obj != "object") return obj;

      var temp = obj.constructor();

      for (var key in obj) temp[key] = clone(obj[key]);
      return temp;
    }

    //Core-Algorithm Related
    function init_status(graph, status, part) {
      status["nodes_to_com"] = {};
      status["total_weight"] = 0;
      status["internals"] = {};
      status["degrees"] = {};
      status["gdegrees"] = {};
      status["loops"] = {};
      status["total_weight"] = get_graph_size(graph);

      if (typeof part == "undefined") {
        graph.nodes.forEach(function (node, i) {
          status.nodes_to_com[node] = i;
          var deg = get_degree_for_node(graph, node);
          if (deg < 0) throw "Bad graph type, use positive weights!";
          status.degrees[i] = deg;
          status.gdegrees[node] = deg;
          status.loops[node] = get_edge_weight(graph, node, node) || 0;
          status.internals[i] = status.loops[node];
        });
      } else {
        graph.nodes.forEach(function (node, i) {
          var com = part[node];
          status.nodes_to_com[node] = com;
          var deg = get_degree_for_node(graph, node);
          status.degrees[com] = (status.degrees[com] || 0) + deg;
          status.gdegrees[node] = deg;
          var inc = 0.0;

          var neighbours = get_neighbours_of_node(graph, node);
          neighbours.forEach(function (neighbour, i) {
            var weight = graph._assoc_mat[node][neighbour];
            if (weight <= 0) {
              throw "Bad graph type, use positive weights";
            }

            if (part[neighbour] == com) {
              if (neighbour == node) {
                inc += weight;
              } else {
                inc += weight / 2.0;
              }
            }
          });
          status.internals[com] = (status.internals[com] || 0) + inc;
        });
      }
    }

    function __modularity(status) {
      var links = status.total_weight;
      console.log('links',links)
      var result = 0.0;
      var communities = make_set(obj_values(status.nodes_to_com));
      console.log('comm',communities)
      communities.forEach(function (com, i) {
        var in_degree = status.internals[com] || 0;
        console.log('indeg',in_degree)
        var degree = status.degrees[com] || 0;
        console.log('deg',degree)
        if (links > 0) {

          result =
            result + in_degree / links - Math.pow(degree / (2.0 * links), 2);
            console.log('mod',result)
        }
      });
      return result;
    }

    function __neighcom(node, graph, status) {
      // compute the communities in the neighb. of the node, with the graph given by
      // node_to_com

      var weights = {};
      var neighboorhood = get_neighbours_of_node(graph, node); //make iterable;

      neighboorhood.forEach(function (neighbour, i) {
        if (neighbour != node) {
          var weight = graph._assoc_mat[node][neighbour] || 1;
          var neighbourcom = status.nodes_to_com[neighbour];
          weights[neighbourcom] = (weights[neighbourcom] || 0) + weight;
        }
      });

      return weights;
    }

    function __insert(node, com, weight, status) {
      //insert node into com and modify status
      status.nodes_to_com[node] = +com;
      status.degrees[com] =
        (status.degrees[com] || 0) + (status.gdegrees[node] || 0);
      status.internals[com] =
        (status.internals[com] || 0) + weight + (status.loops[node] || 0);
    }

    function __remove(node, com, weight, status) {
      //remove node from com and modify status
      status.degrees[com] =
        (status.degrees[com] || 0) - (status.gdegrees[node] || 0);
      status.internals[com] =
        (status.internals[com] || 0) - weight - (status.loops[node] || 0);
      status.nodes_to_com[node] = -1;
    }

    function __renumber(dict) {
      var count = 0;
      var ret = clone(dict); //deep copy :)
      var new_values = {};
      var dict_keys = Object.keys(dict);
      dict_keys.forEach(function (key) {
        var value = dict[key];
        var new_value =
          typeof new_values[value] == "undefined" ? -1 : new_values[value];
        if (new_value == -1) {
          new_values[value] = count;
          new_value = count;
          count = count + 1;
        }
        ret[key] = new_value;
      });
      return ret;
    }

    function __one_level(graph, status) {
      //Compute one level of the Communities Dendogram.
      var modif = true,
        nb_pass_done = 0,
        cur_mod = __modularity(status),
        new_mod = cur_mod;

      while (modif && nb_pass_done != __PASS_MAX) {
        cur_mod = new_mod;
        modif = false;
        nb_pass_done += 1;

        graph.nodes.forEach(function (node, i) {
          var com_node = status.nodes_to_com[node];
          var degc_totw =
            (status.gdegrees[node] || 0) / (status.total_weight * 2.0);
          var neigh_communities = __neighcom(node, graph, status);
          __remove(node, com_node, neigh_communities[com_node] || 0.0, status);
          var best_com = com_node;
          var best_increase = 0;
          var neigh_communities_entries = Object.keys(neigh_communities); //make iterable;

          neigh_communities_entries.forEach(function (com, i) {
            var incr =
              neigh_communities[com] - (status.degrees[com] || 0.0) * degc_totw;
            if (incr > best_increase) {
              best_increase = incr;
              best_com = com;
            }
          });

          __insert(node, best_com, neigh_communities[best_com] || 0, status);

          if (best_com != com_node) modif = true;
        });
        new_mod = __modularity(status);
        if (new_mod - cur_mod < __MIN) break;
      }
    }

    function induced_graph(partition, graph) {
      var ret = { nodes: [], edges: [], _assoc_mat: {} };
      var w_prec, weight;
      //add nodes from partition values
      var partition_values = obj_values(partition);
      ret.nodes = ret.nodes.concat(make_set(partition_values)); //make set
      graph.edges.forEach(function (edge, i) {
        weight = edge.weight || 1;
        var com1 = partition[edge.source];
        var com2 = partition[edge.target];
        w_prec = get_edge_weight(ret, com1, com2) || 0;
        var new_weight = w_prec + weight;
        add_edge_to_graph(ret, {
          source: com1,
          target: com2,
          weight: new_weight,
        });
      });
      return ret;
    }

    function partition_at_level(dendogram, level) {
      console.log('deno',dendogram,level)
      var partition = clone(dendogram[0]);
      for (var i = 1; i < level + 1; i++)
        Object.keys(partition).forEach(function (key, j) {
          var node = key;
          var com = partition[key];
          partition[node] = dendogram[i][com];
        });
      return partition;
    }

    function generate_dendogram(graph, part_init) {
      if (graph.edges.length == 0) {
        var part = {};
        graph.nodes.forEach(function (node, i) {
          part[node] = node;
        });
        return part;
      }
      var status = {};
      init_status(original_graph, status, part_init);
      var mod = __modularity(status);
      var status_list = [];
      __one_level(original_graph, status);
      var new_mod = __modularity(status);
      var partition = __renumber(status.nodes_to_com);
      status_list.push(partition);
      mod = new_mod;
      var current_graph = induced_graph(partition, original_graph);
      init_status(current_graph, status);

      while (true) {
        __one_level(current_graph, status);
        new_mod = __modularity(status);
        if (new_mod - mod < __MIN) break;

        partition = __renumber(status.nodes_to_com);
        status_list.push(partition);

        mod = new_mod;
        current_graph = induced_graph(partition, current_graph);
        init_status(current_graph, status);
      }

      return status_list;
    }

    var core = function () {
      var status = {};
      //third
      var dendogram = generate_dendogram(original_graph, partition_init);
      console.log(dendogram)
      return partition_at_level(dendogram, dendogram.length - 1);
    };

    core.nodes = function (nds) {
      //first
      if (arguments.length > 0) {
        original_graph_nodes = nds;
      }
      return core;
    };

    core.edges = function (edgs) {
      //second
      if (typeof original_graph_nodes == "undefined")
        throw "Please provide the graph nodes first!";

      if (arguments.length > 0) {
        original_graph_edges = edgs;
        var assoc_mat = make_assoc_mat(edgs);
        original_graph = {
          nodes: original_graph_nodes,
          edges: original_graph_edges,
          _assoc_mat: assoc_mat,
        };
      }
      return core;
    };

    core.partition_init = function (prttn) {
      if (arguments.length > 0) {
        partition_init = prttn;
      }
      return core;
    };

    return core;
  };

  var community = jLouvain().nodes(nodeData).edges(linkData);

  var result = community();
  console.log("result", result);
  const defaultRadius = 8;
  nodes.forEach(function (node) {
    node.r = defaultRadius;
    node.cluster = result[node.id];
  });

  // collect clusters from nodes
  const clusters = {};
  nodes.forEach((node) => {
    const radius = node.r;
    const clusterID = node.cluster;
    if (!clusters[clusterID] || radius > clusters[clusterID].r) {
      clusters[clusterID] = node;
    }
  });
  console.log("clusters", clusters);
  keys = Object.keys(clusters);
  for (key in keys){
  document.write("<p>" +clusters[key].id +": "+ clusters[key].url + "</p>");
  
  }
  
  
  const svg = d3
    .select("body")
    .append("svg")
    .attr("height", height)
    .attr("width", width)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  let link = svg.selectAll("line").data(graph.links).enter().append("line");

  link
    .attr("class", "link")
    .style("stroke", "darkgray")
    .style("stroke-width", "2px");

  const circles = svg
    .append("g")
    .datum(nodes)
    .selectAll(".circle")
    .data((d) => d)
    .enter()
    .append("circle")
    .attr("r", (d) => d.r)
    .attr("fill", (d) => z(d.cluster))
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );
    // var label = svg.selectAll(".mytext")
		// 				.data(dataset.nodes)
		// 				.enter()
		// 				.append("text")
		// 			    .text(function (d) { return d.name; })
		// 			    .style("text-anchor", "middle")
		// 			    .style("fill", "#555")
		// 			    .style("font-family", "Arial")
		// 			    .style("font-size", 12);

  const simulation = d3
    .forceSimulation()
    .nodes(nodes)
    .force(
      "link",
      d3.forceLink().id((d) => d.id)
    )
    .velocityDecay(0.2)
    .force("x", d3.forceX().strength(0.0005))
    .force("y", d3.forceY().strength(0.0005))
    .force("collide", collide)
    .force("cluster", clustering)
    .on("tick", ticked);

  simulation.force("link").links(graph.links);
  // .distance([85]);

  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // These are implementations of the custom forces
  function clustering(alpha) {
    nodes.forEach((d) => {
      const cluster = clusters[d.cluster];
      if (cluster === d) return;
      let x = d.x - cluster.x;
      let y = d.y - cluster.y;
      let l = Math.sqrt(x * x + y * y);
      const r = d.r + cluster.r;
      if (l !== r) {
        l = ((l - r) / l) * alpha;
        d.x -= x *= l;
        d.y -= y *= l;
        cluster.x += x;
        cluster.y += y;
      }
    });
  }

  function collide(alpha) {
    const quadtree = d3
      .quadtree()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(nodes);

    nodes.forEach((d) => {
      const r = d.r + maxRadius + Math.max(padding, clusterPadding);
      const nx1 = d.x - r;
      const nx2 = d.x + r;
      const ny1 = d.y - r;
      const ny2 = d.y + r;
      quadtree.visit((quad, x1, y1, x2, y2) => {
        if (quad.data && quad.data !== d) {
          let x = d.x - quad.data.x;
          let y = d.y - quad.data.y;
          let l = Math.sqrt(x * x + y * y);
          const r =
            d.r +
            quad.data.r +
            (d.cluster === quad.data.cluster ? padding : clusterPadding);
          if (l < r) {
            l = ((l - r) / l) * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.data.x += x;
            quad.data.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    });
  }
});
